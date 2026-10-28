import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../shared/simulation-contract'
import { generateGraph } from './graph'
import { runPairedRepetition } from './paired'

describe('paired repetitions', () => {
  const config = { ...DEFAULT_CONFIG, population: 40, repetitions: 3, initialInfected: 3, initialZone: 'random' as const, days: 8 }
  const graph = generateGraph(config.population, config.seed)

  it('shares initial infection IDs and starts all three strategies from the same graph states', () => {
    const result = runPairedRepetition(config, graph, 0)
    expect(result.initialInfectedIds).toHaveLength(3)
    expect(result.strategies.none.statesByDay[0]).toEqual(result.strategies.random.statesByDay[0])
    expect(result.strategies.random.statesByDay[0]).toEqual(result.strategies.targeted.statesByDay[0])
    expect(result.strategies.none.statesByDay[0].filter(state => state === 'I')).toHaveLength(3)
    expect(result.strategies.none.metrics.dosesUsed).toBe(0)
  })

  it('uses independent reproducible repetition seeds and keeps frames from repetition 0 only', () => {
    const first = runPairedRepetition(config, graph, 0)
    const second = runPairedRepetition(config, graph, 1)
    expect(first).toEqual(runPairedRepetition(config, graph, 0))
    expect(first.seed).not.toBe(second.seed)
    expect(first.initialInfectedIds).not.toEqual(second.initialInfectedIds)
    expect(first.strategies.targeted.statesByDay).toHaveLength(config.days + 1)
    expect(second.strategies.targeted.statesByDay).toEqual([])
    expect(second.strategies.targeted.timeline).toHaveLength(config.days + 1)
  })

  it('compares the same daily limit, stock, start, and efficacy for both vaccine strategies', () => {
    const input = { ...config, initialInfected: 0, days: 5, totalVaccines: 7, vaccinesPerDay: 3, interventionDay: 2, vaccineEfficacy: 1 }
    const result = runPairedRepetition(input, graph, 0)
    for (const strategy of ['random', 'targeted'] as const) {
      expect(result.strategies[strategy].timeline.map(day => day.dosesUsed)).toEqual([0, 0, 3, 6, 7, 7])
      expect(result.strategies[strategy].timeline.map(day => day.vaccinated)).toEqual([0, 0, 3, 6, 7, 7])
    }
  })

  it('preserves the entire epidemic path when interventions have no effect', () => {
    const result = runPairedRepetition({ ...config, vaccineEfficacy: 0 }, graph, 0)
    const paths = Object.values(result.strategies).map(run => run.statesByDay)
    expect(paths[0]).toEqual(paths[1])
    expect(paths[1]).toEqual(paths[2])
  })
})
