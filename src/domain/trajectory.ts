import type { ContactGraph, ExperimentConfig, HealthState, Strategy } from '../shared/simulation-contract'
import { validateConfig, ZONES } from './graph'
import { deriveSeed, keyedRandom, randomStream, RANDOM_TAG, shuffle } from './random'

// Compact internal snapshots omit person states for nonillustrated repetitions.
// The public DaySnapshot is assembled by experiment.ts using the shared contract.
export interface TrajectoryDay {
  day: number
  susceptible: number
  infected: number
  recovered: number
  vaccinated: number
  newInfections: number
  totalInfected: number
  dosesUsed: number
}

export interface TrajectoryResult {
  strategy: Strategy
  timeline: TrajectoryDay[]
  statesByDay: HealthState[][]
  vaccinationAttempts: { day: number; personId: number; success: boolean }[]
  metrics: {
    totalInfected: number
    peakInfected: number
    peakDay: number
    dosesUsed: number
    successfullyVaccinated: number
  }
}

export function prepareGraph(graph: ContactGraph): number[][] {
  const adjacency: number[][] = graph.nodes.map((node, id) => {
    if (node.id !== id || !node.zones.length || node.zones.some(zone => !ZONES.includes(zone))) {
      throw new Error('graph.nodes: IDs contiguos y zonas válidas requeridos.')
    }
    return []
  })
  const pairs = new Set<string>()
  for (const { source, target, zone } of graph.edges) {
    if (!Number.isInteger(source) || !Number.isInteger(target) || source < 0 || target < 0 ||
      source >= adjacency.length || target >= adjacency.length || source === target || !ZONES.includes(zone) ||
      !graph.nodes[source].zones.includes(zone) || !graph.nodes[target].zones.includes(zone)) {
      throw new Error('graph.edges: contacto inválido.')
    }
    const pair = `${Math.min(source, target)}:${Math.max(source, target)}`
    if (pairs.has(pair)) throw new Error('graph.edges: par duplicado.')
    pairs.add(pair)
    adjacency[source].push(target)
    adjacency[target].push(source)
  }
  return adjacency
}

export function simulateTrajectory(
  config: ExperimentConfig,
  graph: ContactGraph,
  strategy: Strategy,
  repetitionSeed: number,
  initialInfectedIds: readonly number[],
  keepStates = true,
  adjacency = prepareGraph(graph),
): TrajectoryResult {
  validateConfig(config)
  if (!['none', 'random', 'targeted'].includes(strategy)) throw new Error('strategy: estrategia desconocida.')
  if (graph.nodes.length !== config.population) throw new Error('population: no coincide con graph.nodes.')
  if (initialInfectedIds.length !== config.initialInfected || new Set(initialInfectedIds).size !== initialInfectedIds.length ||
    initialInfectedIds.some(id => !Number.isInteger(id) || id < 0 || id >= config.population)) {
    throw new Error('initialInfected: IDs iniciales inválidos.')
  }
  const states: HealthState[] = Array(config.population).fill('S')
  for (const id of initialInfectedIds) states[id] = 'I'
  const attempted = new Uint8Array(config.population)
  const timeline: TrajectoryDay[] = []
  const statesByDay: HealthState[][] = []
  const vaccinationAttempts: TrajectoryResult['vaccinationAttempts'] = []
  let totalInfected = initialInfectedIds.length
  let dosesUsed = 0
  let peakInfected = 0
  let peakDay = 0
  const selectionRandom = randomStream(deriveSeed(repetitionSeed, RANDOM_TAG.selection))
  const priority = graph.nodes.map(node => node.id).sort((a, b) => adjacency[b].length - adjacency[a].length || a - b)

  const snapshot = (day: number, newInfections: number) => {
    const counts = { S: 0, I: 0, R: 0, V: 0 }
    for (const state of states) counts[state]++
    timeline.push({ day, susceptible: counts.S, infected: counts.I, recovered: counts.R, vaccinated: counts.V, newInfections, totalInfected, dosesUsed })
    if (keepStates) statesByDay.push([...states])
    if (counts.I > peakInfected) { peakInfected = counts.I; peakDay = day }
  }
  snapshot(0, 0)
  for (let day = 1; day <= config.days; day++) {
    const infectious = graph.nodes.filter(node => states[node.id] === 'I').map(node => node.id)
    if (strategy !== 'none' && day >= config.interventionDay && dosesUsed < config.totalVaccines) {
      const eligible = priority.filter(id => states[id] === 'S' && !attempted[id])
      const candidates = strategy === 'random' ? shuffle(eligible, selectionRandom) : eligible
      const allowance = Math.min(config.vaccinesPerDay, config.totalVaccines - dosesUsed, candidates.length)
      for (let index = 0; index < allowance; index++) {
        const personId = candidates[index]
        attempted[personId] = 1
        dosesUsed++
        const success = keyedRandom(repetitionSeed, RANDOM_TAG.efficacy, personId) < config.vaccineEfficacy
        if (success) states[personId] = 'V'
        vaccinationAttempts.push({ day, personId, success })
      }
    }
    const newlyInfected = new Set<number>()
    for (const source of infectious) {
      for (const target of adjacency[source]) {
        if (states[target] === 'S' && keyedRandom(repetitionSeed, RANDOM_TAG.transmission, day,
          Math.min(source, target), Math.max(source, target), source < target ? 0 : 1) < config.transmissionProbability) {
          newlyInfected.add(target)
        }
      }
    }
    for (const id of infectious) {
      if (keyedRandom(repetitionSeed, RANDOM_TAG.recovery, day, id) < config.recoveryProbability) states[id] = 'R'
    }
    for (const id of newlyInfected) states[id] = 'I'
    totalInfected += newlyInfected.size
    snapshot(day, newlyInfected.size)
  }
  return {
    strategy, timeline, statesByDay, vaccinationAttempts,
    metrics: { totalInfected, peakInfected, peakDay, dosesUsed, successfullyVaccinated: timeline[timeline.length - 1].vaccinated },
  }
}
