import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../shared/simulation-contract'
import { generateGraph } from './graph'
import { runPairedRepetition } from './paired'

describe('diverse graph scenarios without guaranteed strategy superiority', () => {
  it.each([
    { transmissionProbability: 0, recoveryProbability: 0, vaccineEfficacy: 0, interventionDay: 1 },
    { transmissionProbability: 1, recoveryProbability: 1, vaccineEfficacy: 1, interventionDay: 1 },
    { transmissionProbability: .08, recoveryProbability: .2, vaccineEfficacy: .9, interventionDay: 5 },
    { transmissionProbability: .6, recoveryProbability: .01, vaccineEfficacy: .4, interventionDay: 20 },
  ])('conserves population and dose eligibility under %j', parameters => {
    for (const seed of [0, 1, 2026, 0xffffffff]) {
      const config = { ...DEFAULT_CONFIG, ...parameters, population: 40, days: 12, seed, totalVaccines: 13, vaccinesPerDay: 3, repetitions: 1 }
      const graph = generateGraph(config.population, config.seed)
      const runs = runPairedRepetition(config, graph, 0)
      for (const run of Object.values(runs.strategies)) {
        expect(run.timeline).toHaveLength(13)
        expect(run.metrics.dosesUsed).toBeLessThanOrEqual(13)
        expect(new Set(run.vaccinationAttempts.map(attempt => attempt.personId)).size).toBe(run.metrics.dosesUsed)
        for (const attempt of run.vaccinationAttempts) {
          expect(attempt.day).toBeGreaterThanOrEqual(config.interventionDay)
          expect(run.statesByDay[attempt.day - 1][attempt.personId]).toBe('S')
        }
        for (const day of run.timeline) {
          expect(day.susceptible + day.infected + day.recovered + day.vaccinated).toBe(40)
          expect(day.totalInfected).toBe(day.infected + day.recovered)
          expect(day.dosesUsed).toBeGreaterThanOrEqual(day.vaccinated)
          if (day.day > 0) {
            const previous = run.timeline[day.day - 1]
            expect(day.dosesUsed - previous.dosesUsed).toBeLessThanOrEqual(3)
            expect(day.totalInfected).toBeGreaterThanOrEqual(previous.totalInfected)
          }
        }
      }
    }
  })
})
