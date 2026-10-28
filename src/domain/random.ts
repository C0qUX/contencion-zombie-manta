// 32-bit integer mixing, deterministic across JS engines. Not cryptographic.
export const RANDOM_TAG = {
  network: 0x4e455457,
  repetition: 0x52455053,
  initial: 0x494e4954,
  selection: 0x53454c45,
  transmission: 0x5452414e,
  recovery: 0x5245434f,
  efficacy: 0x45464649,
} as const

export function deriveSeed(seed: number, ...keys: number[]): number {
  let value = seed >>> 0
  for (const key of keys) {
    value = (value ^ (key >>> 0) ^ 0x9e3779b9) >>> 0
    value = Math.imul(value ^ (value >>> 16), 0x21f0aaad)
    value = Math.imul(value ^ (value >>> 15), 0x735a2d97)
    value = (value ^ (value >>> 15)) >>> 0
  }
  return value
}

export function keyedRandom(seed: number, ...keys: number[]): number {
  return deriveSeed(seed, ...keys) / 0x100000000
}

export function randomStream(seed: number): () => number {
  let counter = 0
  return () => keyedRandom(seed, counter++)
}

export function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1))
    ;[result[index], result[other]] = [result[other], result[index]]
  }
  return result
}
