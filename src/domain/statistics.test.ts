import { describe, expect, it } from 'vitest'
import { mean, nearestRank, pairedDifferences, summarize } from './statistics'

describe('empirical statistics', () => {
  it('uses nearest-rank percentiles, including small and even samples', () => {
    const values = [10, 1, 9, 2, 8, 3, 7, 4, 6, 5]
    expect(nearestRank(values, 0.1)).toBe(1)
    expect(nearestRank(values, 0.9)).toBe(9)
    expect(nearestRank([30, 10], 0.1)).toBe(10)
    expect(nearestRank([30, 10], 0.9)).toBe(30)
    expect(nearestRank([7], 0.1)).toBe(7)
    expect(nearestRank([7], 0.9)).toBe(7)
    expect(nearestRank(values, 0)).toBe(1)
    expect(nearestRank(values, 1)).toBe(10)
    expect(values).toEqual([10, 1, 9, 2, 8, 3, 7, 4, 6, 5])
  })

  it('preserves negative outcomes and averages rather than rounding counts', () => {
    expect(mean([-8, 1, 3])).toBeCloseTo(-4 / 3)
    expect(nearestRank([-8, 1, 3], 0.1)).toBe(-8)
    expect(nearestRank([-8, 1, 3], 0.9)).toBe(3)
  })

  it('rejects empty and nonfinite samples or invalid probabilities', () => {
    expect(() => mean([])).toThrow()
    expect(() => mean([Infinity])).toThrow()
    expect(() => nearestRank([], 0.1)).toThrow()
    expect(() => nearestRank([1], NaN)).toThrow()
    expect(() => nearestRank([1], -0.1)).toThrow()
    expect(() => nearestRank([1], 1.1)).toThrow()
  })

  it('reports all five summary values, including singleton and negative samples', () => {
    expect(summarize([10, 1, 9, 2, 8, 3, 7, 4, 6, 5])).toEqual({ mean: 5.5, min: 1, p10: 1, p90: 9, max: 10 })
    expect(summarize([-3])).toEqual({ mean: -3, min: -3, p10: -3, p90: -3, max: -3 })
  })

  it('subtracts paired repetitions before computing percentiles and keeps negative differences', () => {
    const baseline = [2, 10, 7]
    const targeted = [4, 5, 8]
    expect(pairedDifferences(baseline, targeted)).toEqual({ mean: 2 / 3, min: -2, p10: -2, p90: 5, max: 5 })
    expect(pairedDifferences([1, 9, 8], targeted)).toEqual({ mean: 1 / 3, min: -3, p10: -3, p90: 4, max: 4 })
    expect(baseline).toEqual([2, 10, 7])
    expect(targeted).toEqual([4, 5, 8])
    expect(() => pairedDifferences([1, 2], [1])).toThrow()
    expect(() => pairedDifferences([], [])).toThrow()
    expect(() => summarize([NaN])).toThrow()
  })
})
