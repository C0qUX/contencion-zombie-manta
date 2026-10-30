import { expect, it } from 'vitest'
import { DEFAULT_INPUT } from '../domain/simulation'
import { initialScenario, parseDraft, SCENARIOS, toDraft } from './scenarios'
it('rejects blank and invalid seeds without coercion', () => {
  expect(() => parseDraft({ ...toDraft(DEFAULT_INPUT), seed: '' })).toThrow('seed')
  expect(() => parseDraft({ ...toDraft(DEFAULT_INPUT), seed: '1.5' })).toThrow('seed')
})
it('roundtrips the shared scenario and validates untrusted URL fields', () => {
  expect(initialScenario('?escenario=' + encodeURIComponent(JSON.stringify(DEFAULT_INPUT))).input).toEqual(DEFAULT_INPUT)
  for (const value of ['null', '[]', '{', '{"population":-1}', '{"seed":"2026"}']) {
    const result = initialScenario('?escenario=' + encodeURIComponent(value))
    expect(result.input).toEqual(DEFAULT_INPUT)
    expect(result.notice).toContain('inválida')
  }
})
it.each(SCENARIOS)('has a valid $id preset with unchanged official reference', preset => {
  expect(parseDraft(toDraft({ ...DEFAULT_INPUT, ...preset.changes }))).toEqual({ ...DEFAULT_INPUT, ...preset.changes })
  expect(DEFAULT_INPUT.seed).toBe(2026)
})
