import { describe, expect, it } from 'vitest'
import { compareStrategies, createRandom, simulateOnce, type SimulationInput } from './simulation'

const scenario: SimulationInput = {
  population: 15000,
  initialInfected: 35,
  days: 90,
  transmissionRate: 0.34,
  recoveryRate: 0.16,
  incubationRate: 0.22,
  vaccinesPerDay: 180,
  interventionDay: 6,
  vaccineEfficacy: 0.82,
  seed: 2026,
  runs: 60,
  outbreakLocation: 'mercado',
}

describe('seeded epidemic simulation', () => {
  it('repeats exactly with the same seed and configuration', () => {
    expect(simulateOnce(scenario, 'targeted', 4)).toEqual(simulateOnce(scenario, 'targeted', 4))
  })

  it('changes the trajectory when the seed changes', () => {
    expect(simulateOnce(scenario, 'targeted', 0).timeline)
      .not.toEqual(simulateOnce({ ...scenario, seed: scenario.seed + 1 }, 'targeted', 0).timeline)
  })

  it('creates a deterministic pseudo-random sequence', () => {
    const first = createRandom(42)
    const second = createRandom(42)
    expect([first(), first(), first()]).toEqual([second(), second(), second()])
  })

  it('conserves the population every day', () => {
    for (const day of simulateOnce(scenario, 'targeted').timeline) {
      expect(day.susceptible + day.exposed + day.infected + day.recovered + day.vaccinated).toBe(scenario.population)
    }
  })

  it('records daily place states only on request and they add up to the daily totals', () => {
    const plain = simulateOnce(scenario, 'targeted', 2)
    const recorded = simulateOnce(scenario, 'targeted', 2, undefined, true)
    expect(plain.zoneTimeline).toBeUndefined()
    expect({ ...recorded, zoneTimeline: undefined }).toEqual({ ...plain, zoneTimeline: undefined })
    expect(recorded.zoneTimeline).toHaveLength(scenario.days + 1)
    recorded.zoneTimeline!.forEach((zones, day) => {
      const sum = (key: 'susceptible' | 'exposed' | 'infected' | 'recovered' | 'vaccinated') => zones.reduce((total, zone) => total + zone[key], 0)
      expect([sum('susceptible'), sum('exposed'), sum('infected'), sum('recovered'), sum('vaccinated')])
        .toEqual([recorded.timeline[day].susceptible, recorded.timeline[day].exposed, recorded.timeline[day].infected, recorded.timeline[day].recovered, recorded.timeline[day].vaccinated])
    })
    expect(recorded.zoneTimeline!.at(-1)).toEqual(recorded.finalZones)
  })

  it('never protects more people than doses used', () => {
    const result = simulateOnce(scenario, 'targeted')
    expect(result.protectedPeople).toBeLessThanOrEqual(result.dosesUsed)
    expect(result.dosesUsed).toBeLessThanOrEqual(result.dosesAvailable)
  })

  it('gives targeted and random strategies the same available resources', () => {
    expect(simulateOnce(scenario, 'targeted').dosesAvailable).toBe(simulateOnce(scenario, 'random').dosesAvailable)
  })

  it('reports Monte Carlo ranges for all three strategies', () => {
    const result = compareStrategies({ ...scenario, runs: 20 })
    for (const strategy of [result.targeted, result.random, result.none]) {
      expect(strategy.p10Affected).toBeLessThanOrEqual(strategy.meanAffected)
      expect(strategy.meanAffected).toBeLessThanOrEqual(strategy.p90Affected)
      expect(strategy.p10Affected).toBeLessThanOrEqual(strategy.medianAffected)
      expect(strategy.medianAffected).toBeLessThanOrEqual(strategy.p90Affected)
      expect(strategy.timeline).toHaveLength(scenario.days + 1)
    }
    for (const run of Object.values(result.example)) expect(run.zoneTimeline).toHaveLength(scenario.days + 1)
  })

  it('beats both baselines in the documented default scenario', () => {
    const result = compareStrategies(scenario)
    expect(result.targeted.meanAffected).toBeLessThan(result.none.meanAffected)
    expect(result.targeted.meanAffected).toBeLessThanOrEqual(result.random.meanAffected)
  })

  it.each([
    ['doble contagiosidad', { transmissionRate: 0.68 }],
    ['mitad de vacunas', { vaccinesPerDay: 90 }],
    ['eficacia parcial', { vaccineEfficacy: 0.5 }],
    ['brote en bus', { outbreakLocation: 'bus' as const }],
  ])('remains useful during the surprise scenario: %s', (_name, changes) => {
    const result = compareStrategies({ ...scenario, ...changes, runs: 30 })
    expect(result.targeted.meanAffected).toBeLessThan(result.none.meanAffected)
    expect(result.targeted.meanAffected).toBeLessThanOrEqual(result.random.meanAffected)
  })
})
