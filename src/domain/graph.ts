import type { ContactGraph, ExperimentConfig, Zone } from '../shared/simulation-contract'
import { deriveSeed, randomStream, RANDOM_TAG, shuffle } from './random'

export const ZONES: readonly Zone[] = ['home', 'school', 'market', 'transport']

function integer(name: string, value: number, minimum: number, maximum = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name}: debe ser un entero entre ${minimum} y ${maximum}.`)
  }
}

export function validateConfig(config: ExperimentConfig): void {
  if (!config || typeof config !== 'object') throw new Error('config: se requiere una configuración.')
  integer('population', config.population, 4)
  integer('days', config.days, 0)
  integer('initialInfected', config.initialInfected, 0, config.population)
  integer('vaccinesPerDay', config.vaccinesPerDay, 0)
  integer('totalVaccines', config.totalVaccines, 0)
  integer('interventionDay', config.interventionDay, 0)
  integer('repetitions', config.repetitions, 1)
  integer('seed', config.seed, 0, 0xffffffff)
  for (const name of ['transmissionProbability', 'recoveryProbability', 'vaccineEfficacy'] as const) {
    if (!Number.isFinite(config[name]) || config[name] < 0 || config[name] > 1) {
      throw new Error(`${name}: debe ser una probabilidad entre 0 y 1.`)
    }
  }
  if (config.initialZone !== 'random' && !ZONES.includes(config.initialZone)) {
    throw new Error('initialZone: use home, school, market, transport o random.')
  }
}

export function deriveNetworkSeed(experimentSeed: number): number {
  return deriveSeed(experimentSeed, RANDOM_TAG.network)
}

/** Seed is the derived network seed, also exposed in ExperimentResult.example. */
export function generateGraph(population: number, seed: number): ContactGraph {
  integer('population', population, 4)
  integer('seed', seed, 0, 0xffffffff)
  const random = randomStream(seed)
  const ids = shuffle(Array.from({ length: population }, (_, id) => id), random)
  const nodes: ContactGraph['nodes'] = Array.from({ length: population }, (_, id) => ({ id, zones: ['home'] }))
  const pools: Record<Zone, number[]> = { home: ids, school: [], market: [], transport: [] }
  ids.forEach((id, index) => {
    if (index % 4 < 2) pools.school.push(id)
    if (index % 4 === 1 || index % 4 === 2) pools.market.push(id)
    if (index % 4 >= 2) pools.transport.push(id)
  })
  for (const zone of ZONES) {
    if (zone !== 'home') for (const id of pools[zone]) nodes[id].zones.push(zone)
  }
  const edges: ContactGraph['edges'] = []
  const pairs = new Set<string>()
  const add = (left: number, right: number, zone: Zone) => {
    if (left === right) return
    const source = Math.min(left, right)
    const target = Math.max(left, right)
    const key = `${source}:${target}`
    if (pairs.has(key)) return
    pairs.add(key)
    edges.push({ source, target, zone })
  }
  // Reserve a contact in each setting before household cliques fill small graphs.
  for (const zone of ['school', 'market', 'transport', 'home'] as const) {
    add(pools[zone][0], pools[zone][1], zone)
  }
  for (let start = 0; start < population; start += 4) {
    const household = ids.slice(start, start + 4)
    for (let a = 0; a < household.length; a++) {
      for (let b = a + 1; b < household.length; b++) add(household[a], household[b], 'home')
    }
  }
  for (const zone of ['school', 'market', 'transport'] as const) {
    const members = shuffle(pools[zone], random)
    // Local rings plus hubs: heterogeneous degree without a dense N² network.
    const groupSize = zone === 'school' ? 16 : zone === 'market' ? 24 : 12
    for (let index = 0; index < members.length; index++) {
      add(members[index], members[(index + 1) % members.length], zone)
      add(members[index], members[(index + 2) % members.length], zone)
      const hub = Math.floor(index / groupSize) * groupSize
      add(members[index], members[hub], zone)
    }
  }
  edges.sort((a, b) => a.source - b.source || a.target - b.target)
  return { nodes, edges }
}

export function selectInitialInfected(graph: ContactGraph, count: number, zone: Zone | 'random', seed: number): number[] {
  integer('initialInfected', count, 0, graph.nodes.length)
  if (zone !== 'random' && !ZONES.includes(zone)) throw new Error('initialZone: zona desconocida.')
  const candidates = graph.nodes.filter(node => zone === 'random' || node.zones.includes(zone)).map(node => node.id)
  if (count > candidates.length) {
    throw new Error(`initialInfected: la zona ${zone} tiene ${candidates.length} candidatos; se solicitaron ${count}.`)
  }
  return shuffle(candidates, randomStream(deriveSeed(seed, RANDOM_TAG.initial))).slice(0, count).sort((a, b) => a - b)
}
