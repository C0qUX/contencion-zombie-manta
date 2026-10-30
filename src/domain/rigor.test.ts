import { describe, expect, it } from 'vitest'
import { compareStrategies, DEFAULT_INPUT, locationPopulations, randomAllocation, simulateOnce, summarizeDifferences, validateInput } from './simulation'

const small = { ...DEFAULT_INPUT, population: 100, initialInfected: 1, days: 15, runs: 3, vaccinesPerDay: 3, totalVaccines: 7 }
describe('comparison audit', () => {
  it.each([0, 1, 42, 2026, 4294967295])('has identical trajectories with zero efficacy, seed %i', seed => {
    const input = { ...small, seed, vaccineEfficacy: 0 }
    const runs = ['targeted', 'random', 'none'].map(strategy => simulateOnce(input, strategy as 'targeted' | 'random' | 'none'))
    expect(runs[0].timeline).toEqual(runs[1].timeline)
    expect(runs[1].timeline).toEqual(runs[2].timeline)
    expect(runs[0].dosesUsed).toBe(7)
    expect(runs[1].dosesUsed).toBe(7)
  })
  it.each([{ totalVaccines: 0 }, { vaccinesPerDay: 0 }, { interventionDay: 16 }])('preserves all trajectories without intervention %j', changes => {
    const result = compareStrategies({ ...small, ...changes })
    expect(result.targeted.timeline).toEqual(result.none.timeline)
    expect(result.random.timeline).toEqual(result.none.timeline)
    expect(result.savedVsRandom).toBe(0)
  })
  it('starts on the named day, leaves day zero untouched, and consumes failures', () => {
    const run = simulateOnce({ ...small, interventionDay: 1, transmissionRate: 0, vaccineEfficacy: 0 }, 'targeted')
    expect(run.timeline[0].vaccinated).toBe(0)
    expect(run.firstAllocation.reduce((a, b) => a + b, 0)).toBe(3)
    expect(run.dosesUsed).toBe(7)
    expect(run.protectedPeople).toBe(0)
    expect(run.totalAffected).toBe(1)
    expect(simulateOnce({ ...small, interventionDay: small.days }, 'targeted').dosesAvailable).toBe(3)
  })
  it('samples uniformly without replacement rather than filling the first place', () => {
    const zones = [1, 2].map(susceptible => ({ susceptible, exposed: 0, infected: 0, recovered: 0, vaccinated: 0 }))
    expect([.1, .4, .8].map(ticket => randomAllocation(zones, 1, () => ticket))).toEqual([[1, 0], [0, 1], [0, 1]])
    expect(randomAllocation(zones, 3, () => .5)).toEqual([1, 2])
    expect(randomAllocation(zones, 2, () => .1)).toEqual([0, 2])
  })
  it('prevents same-day cascades and keeps all counts integral at probability endpoints', () => {
    for (const strategy of ['targeted', 'random', 'none'] as const) {
      const run = simulateOnce({ ...small, transmissionRate: 1, recoveryRate: 1, incubationRate: 1, vaccineEfficacy: 1 }, strategy)
      expect(run.timeline[1].infected).toBe(0)
      for (const day of run.timeline) {
        const counts = [day.susceptible, day.exposed, day.infected, day.recovered, day.vaccinated]
        expect(counts.every(value => Number.isInteger(value) && value >= 0)).toBe(true)
        expect(counts.reduce((a, b) => a + b, 0)).toBe(100)
      }
      expect(run.dosesUsed).toBeLessThanOrEqual(7)
      expect(run.totalAffected).toBe(100 - run.timeline.at(-1)!.susceptible - run.protectedPeople)
    }
  })
  it('cannot vaccinate anyone when the whole population is initially infected or immune after recovery', () => {
    // Every initial case must fit its named place; a full market is eligible for none there.
    const input = { ...small, initialInfected: locationPopulations(100)[2], recoveryRate: 1, transmissionRate: 0, interventionDay: 1 }
    const run = simulateOnce(input, 'targeted')
    expect(run.firstAllocation[2]).toBe(0)
    expect(run.finalZones[2].vaccinated).toBe(0)
    expect(run.finalZones[2].recovered).toBe(input.initialInfected)
  })
  it('preserves negative paired values and uses interpolated empirical percentiles', () => {
    expect(summarizeDifferences([-10, 0, 20])).toEqual({ mean: 10 / 3, median: 0, p10: -8, p90: 16, min: -10, max: 20 })
    expect(summarizeDifferences([4, 1, 3, 2]).median).toBe(2.5)
  })
  it('reports a real loss without truncating or relabelling it as a benefit', () => {
    const result = compareStrategies({ ...DEFAULT_INPUT, population: 100, initialInfected: 1, days: 30, runs: 1, totalVaccines: 10, vaccinesPerDay: 2, seed: 14 })
    expect(result.targeted.meanAffected).toBeGreaterThan(result.random.meanAffected)
    expect(result.savedVsRandom).toBe(-1)
    expect(result.pairedVsRandom.p10).toBe(-1)
  })
  it('is cloneable and deterministic including callback execution', () => {
    const events: number[] = []
    const result = compareStrategies(small, completed => events.push(completed))
    expect(events).toEqual([1, 2, 3])
    expect(result).toEqual(compareStrategies(small))
    expect(structuredClone(result)).toEqual(result)
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    expect(result.pairedVsRandom.mean).toBeCloseTo(result.random.meanAffected - result.targeted.meanAffected, 10)
    expect(result.targeted.dosesAvailable).toBe(result.random.dosesAvailable)
  })
})

describe('strict public configuration', () => {
  it.each([
    ['population', NaN], ['population', 99], ['population', 50001], ['population', 100.5],
    ['seed', -1], ['seed', 4294967296], ['seed', 2.5], ['runs', 0], ['runs', 301],
    ['days', 0], ['days', Infinity], ['vaccinesPerDay', -1], ['vaccinesPerDay', 101],
    ['totalVaccines', -1], ['totalVaccines', .5], ['vaccineEfficacy', 1.01],
    ['transmissionRate', Infinity], ['recoveryRate', NaN], ['incubationRate', -.1],
    ['interventionDay', 0], ['interventionDay', 17], ['outbreakLocation', 'desconocido'],
    ['initialInfected', 15],
  ])('rejects %s=%s rather than silently correcting it', (key, value) => {
    expect(() => validateInput({ ...small, [key]: value })).toThrow(key)
  })
})
