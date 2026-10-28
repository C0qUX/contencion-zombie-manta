import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../shared/simulation-contract'
import { generateGraph, selectInitialInfected, validateConfig } from './graph'

describe('synthetic contact graph', () => {
  it.each([4, 5, 17, 400])('preserves contiguous IDs and all four contact settings at population %i', population => {
    const graph = generateGraph(population, 2026)
    expect(graph.nodes.map(node => node.id)).toEqual(Array.from({ length: population }, (_, id) => id))
    expect(new Set(graph.edges.map(edge => edge.zone))).toEqual(new Set(['home', 'school', 'market', 'transport']))
    const pairs = new Set<string>()
    for (const edge of graph.edges) {
      expect(edge.source).toBeLessThan(edge.target)
      expect(edge.source).toBeGreaterThanOrEqual(0)
      expect(edge.target).toBeLessThan(population)
      const pair = `${edge.source}:${edge.target}`
      expect(pairs.has(pair)).toBe(false)
      pairs.add(pair)
      expect(graph.nodes[edge.source].zones).toContain(edge.zone)
      expect(graph.nodes[edge.target].zones).toContain(edge.zone)
    }
  })

  it('uses the network seed and reproduces the whole graph', () => {
    expect(generateGraph(40, 1)).toEqual(generateGraph(40, 1))
    expect(generateGraph(40, 1)).not.toEqual(generateGraph(40, 2))
  })

  it('selects unique initial infections in the requested zone, without filling from elsewhere', () => {
    const graph = generateGraph(20, 2026)
    const selected = selectInitialInfected(graph, 3, 'market', 42)
    expect(selected).toEqual(selectInitialInfected(graph, 3, 'market', 42))
    expect(new Set(selected).size).toBe(3)
    expect(selected.every(id => graph.nodes[id].zones.includes('market'))).toBe(true)
    expect(() => selectInitialInfected(graph, 20, 'market', 42)).toThrow(/market/)
    expect(selectInitialInfected(graph, 20, 'random', 42)).toHaveLength(20)
  })
})

describe('configuration validation', () => {
  it('accepts day zero, no initial cases, no doses, and interventions outside the horizon', () => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, days: 0, initialInfected: 0, totalVaccines: 0, interventionDay: 90 })).not.toThrow()
  })

  it.each([
    ['population', 3], ['population', 4.5], ['days', -1], ['days', NaN],
    ['initialInfected', 401], ['initialInfected', -1], ['repetitions', 0],
    ['transmissionProbability', 1.01], ['recoveryProbability', -0.1], ['vaccineEfficacy', Infinity],
    ['totalVaccines', -1], ['vaccinesPerDay', 0.5], ['interventionDay', -1],
    ['seed', NaN], ['seed', 2 ** 32], ['initialZone', 'elsewhere'],
  ])('rejects invalid %s=%s instead of silently coercing it', (field, value) => {
    expect(() => validateConfig({ ...DEFAULT_CONFIG, [field]: value })).toThrow(field)
  })
})
