import {
  CONTRACT_VERSION,
  type DaySnapshot,
  type ExperimentResult,
  type RunExperiment,
  type Strategy,
  type StrategySummary,
} from '../shared/simulation-contract'
import { deriveNetworkSeed, generateGraph, validateConfig } from './graph'
import { runPairedRepetition, STRATEGIES } from './paired'
import { pairedDifferences, summarize } from './statistics'
import { prepareGraph, type TrajectoryResult } from './trajectory'

// Separate from CONTRACT_VERSION: algorithm changes need their own version.
// Exported alongside the engine without adding fields to the agreed result DTO.
export const ALGORITHM_VERSION = 'sirv-graph-1.0.0' as const

const MODEL_WARNINGS = [
  'Población y contactos sintéticos inspirados en Manta; no representan un mapa geográfico real ni datos sanitarios calibrados.',
  'Simulación educativa; los resultados no son recomendaciones clínicas ni equivalen a vidas salvadas.',
  'Se supone que los estados S/I/R/V y los intentos previos de vacunación son observables; R y V permanecen inmunes.',
  'P10–P90 es un rango empírico de ejecuciones, no un intervalo de confianza del promedio.',
  'La red individual ilustra siempre la repetición 0; puede diferir de los promedios y una estrategia puede perder.',
] as const

function strategyRecord<T>(factory: (strategy: Strategy) => T): Record<Strategy, T> {
  return { none: factory('none'), random: factory('random'), targeted: factory('targeted') }
}

function publicTimeline(run: TrajectoryResult): DaySnapshot[] {
  return run.timeline.map((day, index) => ({
    day: day.day,
    susceptible: day.susceptible,
    infected: day.infected,
    recovered: day.recovered,
    vaccinated: day.vaccinated,
    cumulativeInfected: day.totalInfected,
    dosesUsed: day.dosesUsed,
    states: run.statesByDay[index],
  }))
}

export const runExperiment: RunExperiment = (input, onProgress) => {
  validateConfig(input)
  // Subscribers can mutate their original object without changing this run.
  const config = { ...input }
  const networkSeed = deriveNetworkSeed(config.seed)
  const graph = generateGraph(config.population, networkSeed)
  const adjacency = prepareGraph(graph)
  const samples = strategyRecord(() => ({
    totalInfected: [] as number[],
    peakInfected: [] as number[],
    dosesUsed: [] as number[],
    daily: Array.from({ length: config.days + 1 }, () => [] as number[]),
  }))
  let example: ExperimentResult['example'] | undefined

  for (let repetition = 0; repetition < config.repetitions; repetition++) {
    const paired = runPairedRepetition(config, graph, repetition, adjacency)
    for (const strategy of STRATEGIES) {
      const run = paired.strategies[strategy]
      samples[strategy].totalInfected.push(run.metrics.totalInfected)
      samples[strategy].peakInfected.push(run.metrics.peakInfected)
      samples[strategy].dosesUsed.push(run.metrics.dosesUsed)
      run.timeline.forEach((day, index) => samples[strategy].daily[index].push(day.infected))
    }
    if (repetition === 0) {
      example = {
        repetition: 0, networkSeed, trialSeed: paired.seed, graph,
        timelines: strategyRecord(strategy => publicTimeline(paired.strategies[strategy])),
      }
    }
    onProgress?.({ completed: repetition + 1, total: config.repetitions })
  }
  // Validation enforces at least one complete repetition.
  if (!example) throw new Error('repetitions: no se completó ninguna repetición.')
  const strategies = strategyRecord<StrategySummary>(strategy => ({
    strategy,
    totalInfected: summarize(samples[strategy].totalInfected),
    peakInfected: summarize(samples[strategy].peakInfected),
    dosesUsed: summarize(samples[strategy].dosesUsed),
    daily: samples[strategy].daily.map((values, day) => ({ day, infected: summarize(values) })),
  }))
  return {
    contractVersion: CONTRACT_VERSION,
    config,
    strategies,
    avoidedVsNone: pairedDifferences(samples.none.totalInfected, samples.targeted.totalInfected),
    avoidedVsRandom: pairedDifferences(samples.random.totalInfected, samples.targeted.totalInfected),
    example,
    warnings: [...MODEL_WARNINGS],
  }
}
