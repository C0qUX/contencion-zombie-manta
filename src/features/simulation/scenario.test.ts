import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../../shared/simulation-contract'
import { applySurprise, configToDraft, formatNumber, parseDraft, recommendation } from './scenario'

describe('scenario editing', () => {
  it('preserves exact defaults and rejects blank, fractional and nonfinite inputs', () => {
    const draft = configToDraft(DEFAULT_CONFIG)
    expect(parseDraft(draft).config).toEqual(DEFAULT_CONFIG)
    for (const seed of ['', '1.2', '-1', '4294967296', 'Infinity']) {
      expect(parseDraft({ ...draft, seed }).errors.seed).toBeTruthy()
    }
    expect(parseDraft({ ...draft, totalVaccines: '-1' }).config).toBeUndefined()
    expect(parseDraft({ ...draft, transmissionProbability: 'NaN' }).config).toBeUndefined()
  })
  it('enforces dependent limits and the actual initial-zone capacity', () => {
    const draft = configToDraft(DEFAULT_CONFIG)
    expect(parseDraft({ ...draft, population: '49' }).errors.population).toBeTruthy()
    expect(parseDraft({ ...draft, vaccinesPerDay: '401' }).errors.vaccinesPerDay).toBeTruthy()
    expect(parseDraft({ ...draft, interventionDay: '32' }).errors.interventionDay).toBeTruthy()
    expect(parseDraft({ ...draft, initialInfected: '400' }).errors.initialInfected).toBeTruthy()
    expect(parseDraft({ ...draft, initialZone: 'random', initialInfected: '400' }).config?.initialInfected).toBe(400)
    expect(parseDraft({ ...draft, initialZone: 'unknown' }).config).toBeUndefined()
  })
  it('accumulates surprises without changing the daily budget or initial count', () => {
    let draft = configToDraft({ ...DEFAULT_CONFIG, transmissionProbability: 0.6, totalVaccines: 81, initialInfected: 3, initialZone: 'home' })
    const capped = applySurprise(draft, 'contagion')
    expect(capped.draft.transmissionProbability).toBe('1')
    expect(capped.message).toContain('máximo')
    draft = applySurprise(capped.draft, 'stock').draft
    draft = applySurprise(draft, 'stock').draft
    draft = applySurprise(draft, 'market').draft
    draft = applySurprise(draft, 'variant').draft
    expect(parseDraft(draft).config).toMatchObject({ transmissionProbability: 1, totalVaccines: 20, vaccinesPerDay: 20, initialZone: 'market', initialInfected: 3, vaccineEfficacy: 0.5 })
    expect(applySurprise({ ...draft, totalVaccines: '' }, 'stock').draft.totalVaccines).toBe('')
  })
  it('keeps negative, equal and uncertain comparisons honest', () => {
    expect(formatNumber(-0.005)).toContain('0,005')
    expect(recommendation({ mean: -2, min: -5, p10: -4, p90: 1, max: 3 })).toContain('2 contagios más')
    expect(recommendation({ mean: 0, min: -5, p10: -4, p90: 1, max: 3 })).toContain('empatan')
    const text = recommendation({ mean: 2, min: -5, p10: -4, p90: 1, max: 3 })
    expect(text).toContain('2 contagios evitados')
    expect(text).toContain('-4')
  })
})
