import type { Statistics } from '../shared/simulation-contract'

function validateSample(values: readonly number[]): void {
  if (!values.length || values.some(value => !Number.isFinite(value))) {
    throw new Error('statistics: se requiere una muestra no vacía de números finitos.')
  }
}

export function mean(values: readonly number[]): number {
  validateSample(values)
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Empirical nearest rank; P10–P90 is not a confidence interval of the mean. */
export function nearestRank(values: readonly number[], probability: number): number {
  validateSample(values)
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error('probability: debe estar entre 0 y 1.')
  }
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(probability * sorted.length) - 1)]
}
export function summarize(values: readonly number[]): Statistics {
  validateSample(values)
  const sorted = [...values].sort((a, b) => a - b)
  return {
    mean: mean(values),
    min: sorted[0],
    p10: sorted[Math.max(0, Math.ceil(.1 * sorted.length) - 1)],
    p90: sorted[Math.max(0, Math.ceil(.9 * sorted.length) - 1)],
    max: sorted[sorted.length - 1],
  }
}

export function pairedDifferences(reference: readonly number[], strategy: readonly number[]): Statistics {
  if (reference.length !== strategy.length) throw new Error('statistics: se requieren muestras pareadas de igual longitud.')
  validateSample(reference)
  validateSample(strategy)
  return summarize(reference.map((value, repetition) => value - strategy[repetition]))
}
