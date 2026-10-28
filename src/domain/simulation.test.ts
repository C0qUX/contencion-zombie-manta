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

  // Compatibility checks for the prototype only; the graph engine is tested separately.
  // Vaccine strategies cannot be required to win for every seed or configuration.
  it('keeps the three legacy timelines available until the interface migrates', () => {
    const result = compareStrategies(scenario)
    expect(Object.keys(result).sort()).toEqual(['noIntervention', 'randomIntervention', 'strategy'])
    for (const run of Object.values(result)) expect(run.timeline).toHaveLength(scenario.days + 1)
  })
})
