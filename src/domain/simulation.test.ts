import { describe, expect, it } from 'vitest'
import { compareStrategies, simulate } from './simulation'

const scenario = { population: 10000, initialInfected: 20, days: 60, transmissionRate: .32, recoveryRate: .16, vaccinesPerDay: 150, interventionDay: 5, seed: 2028 }

describe('simulate', () => {
  it('is reproducible for the same configuration', () => {
    expect(simulate(scenario)).toEqual(simulate(scenario))
  })

  it('conserves the population every day', () => {
    for (const day of simulate(scenario).timeline) {
      expect(day.susceptible + day.infected + day.recovered + day.vaccinated).toBe(scenario.population)
    }
  })

  it('compares the proposed strategy against two baselines', () => {
    const result = compareStrategies(scenario)
    expect(result.strategy.totalAffected).toBeLessThan(result.noIntervention.totalAffected)
    expect(result.strategy.totalAffected).toBeLessThanOrEqual(result.randomIntervention.totalAffected)
  })
})
