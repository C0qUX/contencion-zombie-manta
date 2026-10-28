import type { ContactGraph, ExperimentConfig, Strategy } from '../shared/simulation-contract'
import { selectInitialInfected, validateConfig } from './graph'
import { deriveSeed, RANDOM_TAG } from './random'
import { prepareGraph, simulateTrajectory, type TrajectoryResult } from './trajectory'

export const STRATEGIES: readonly Strategy[] = ['none', 'random', 'targeted']

/** Internal paired run; experiment.ts aggregates it into the shared result. */
export function runPairedRepetition(config: ExperimentConfig, graph: ContactGraph, repetition: number, adjacency = prepareGraph(graph)) {
  validateConfig(config)
  if (!Number.isSafeInteger(repetition) || repetition < 0 || repetition >= config.repetitions) {
    throw new Error('repetition: índice fuera del experimento.')
  }
  const seed = deriveSeed(config.seed, RANDOM_TAG.repetition, repetition)
  const initialInfectedIds = selectInitialInfected(graph, config.initialInfected, config.initialZone, seed)
  const strategies = Object.fromEntries(STRATEGIES.map(strategy => [strategy,
    simulateTrajectory(config, graph, strategy, seed, initialInfectedIds, repetition === 0, adjacency),
  ])) as Record<Strategy, TrajectoryResult>
  return { repetition, seed, initialInfectedIds, strategies }
}
