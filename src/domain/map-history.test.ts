import { expect, it } from 'vitest'
import { compareStrategies, DEFAULT_INPUT, REFERENCE_POLICY, simulateOnce } from './simulation'
const input = { ...DEFAULT_INPUT, population: 100, initialInfected: 1, days: 12, runs: 2, totalVaccines: 20, vaccinesPerDay: 3 }
it('retains daily maps only when requested without changing simulation values', () => {
  const normal = simulateOnce(input, 'targeted')
  const { zonesTimeline, dosesTimeline, ...withHistory } = simulateOnce(input, 'targeted', 0, REFERENCE_POLICY, true)
  expect(withHistory).toEqual(normal)
  expect(normal.zonesTimeline).toBeUndefined()
  expect(zonesTimeline).toHaveLength(13)
  expect(dosesTimeline).toHaveLength(13)
  expect(zonesTimeline!.at(-1)).toEqual(normal.finalZones)
  expect(dosesTimeline!.at(-1)).toEqual(normal.dosesByLocation)
  expect(dosesTimeline![0]).toEqual([0, 0, 0, 0, 0])
  for (const [day, zones] of zonesTimeline!.entries()) {
    for (const field of ['susceptible', 'exposed', 'infected', 'recovered', 'vaccinated'] as const) {
      expect(zones.reduce((sum, zone) => sum + zone[field], 0)).toBe(normal.timeline[day][field])
    }
    expect(dosesTimeline![day].reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(20)
  }
  expect(zonesTimeline![0][0]).not.toBe(zonesTimeline![1][0])
})
it('keeps replayable histories for the three illustrated strategies and preserves repeatability', () => {
  const result = compareStrategies(input)
  expect(result).toEqual(compareStrategies(input))
  expect(result).toEqual(JSON.parse(JSON.stringify(result)))
  for (const run of Object.values(result.example)) {
    expect(run.zonesTimeline).toHaveLength(input.days + 1)
    expect(run.dosesTimeline!.at(-1)).toEqual(run.dosesByLocation)
  }
})
