import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type ContactGraph, type ExperimentConfig } from '../shared/simulation-contract'
import { prepareGraph, simulateTrajectory } from './trajectory'

const line: ContactGraph = {
  nodes: Array.from({ length: 4 }, (_, id) => ({ id, zones: ['home'] })),
  edges: [{ source: 0, target: 1, zone: 'home' }, { source: 1, target: 2, zone: 'home' }, { source: 2, target: 3, zone: 'home' }],
}
const config: ExperimentConfig = {
  ...DEFAULT_CONFIG, population: 4, days: 3, initialZone: 'random', transmissionProbability: 1,
  recoveryProbability: 1, totalVaccines: 0, repetitions: 1,
}

describe('daily graph SIRV', () => {
  it('keeps day 0 untouched and prevents same-day transmission or recovery by new infections', () => {
    const run = simulateTrajectory(config, line, 'none', 123, [0])
    expect(run.statesByDay).toEqual([
      ['I', 'S', 'S', 'S'], ['R', 'I', 'S', 'S'], ['R', 'R', 'I', 'S'], ['R', 'R', 'R', 'I'],
    ])
    expect(run.timeline.map(day => day.newInfections)).toEqual([0, 1, 1, 1])
    expect(run.metrics).toMatchObject({ totalInfected: 4, peakInfected: 1, peakDay: 0, dosesUsed: 0 })
  })

  it('applies vaccination before infection on interventionDay, and continues after extinction', () => {
    const run = simulateTrajectory({ ...config, days: 4, totalVaccines: 3, vaccinesPerDay: 1, interventionDay: 2, vaccineEfficacy: 1 }, line, 'targeted', 123, [0])
    expect(run.statesByDay).toEqual([
      ['I', 'S', 'S', 'S'], ['R', 'I', 'S', 'S'], ['R', 'R', 'V', 'S'],
      ['R', 'R', 'V', 'V'], ['R', 'R', 'V', 'V'],
    ])
    expect(run.vaccinationAttempts).toEqual([{ day: 2, personId: 2, success: true }, { day: 3, personId: 3, success: true }])
    expect(run.metrics.dosesUsed).toBe(2)
  })

  it('uses total static degree and ascending ID ties among currently eligible susceptibles', () => {
    const run = simulateTrajectory({ ...config, transmissionProbability: 0, totalVaccines: 3, vaccinesPerDay: 2, vaccineEfficacy: 0 }, line, 'targeted', 123, [0])
    expect(run.vaccinationAttempts.map(attempt => [attempt.day, attempt.personId])).toEqual([[1, 1], [1, 2], [2, 3]])
    expect(run.metrics).toMatchObject({ dosesUsed: 3, successfullyVaccinated: 0 })
    expect(run.statesByDay[3]).toEqual(['R', 'S', 'S', 'S'])
  })

  it('recomputes eligibility daily so a newly infected candidate never receives a dose', () => {
    const branching: ContactGraph = {
      nodes: Array.from({ length: 6 }, (_, id) => ({ id, zones: ['home'] })),
      edges: [[0, 1], [0, 2], [1, 3], [1, 4], [1, 5]].map(([source, target]) => ({ source, target, zone: 'home' })),
    }
    const run = simulateTrajectory({ ...config, population: 6, days: 2, totalVaccines: 2, vaccinesPerDay: 1, vaccineEfficacy: 1 }, branching, 'targeted', 123, [0])
    // Person 2 is infected on day 1 without ever receiving a vaccination attempt.
    expect(run.statesByDay[1]).toEqual(['R', 'V', 'I', 'S', 'S', 'S'])
    expect(run.vaccinationAttempts.map(attempt => [attempt.day, attempt.personId])).toEqual([[1, 1], [2, 3]])
    expect(run.statesByDay[2]).toEqual(['R', 'V', 'R', 'V', 'S', 'S'])
  })

  it.each(['random', 'targeted'] as const)('enforces daily and total limits for %s without retrying failed doses', strategy => {
    const run = simulateTrajectory({ ...config, days: 5, initialInfected: 0, transmissionProbability: 0, totalVaccines: 3, vaccinesPerDay: 2, vaccineEfficacy: 0 }, line, strategy, 456, [])
    expect(run.timeline.map(day => day.dosesUsed)).toEqual([0, 2, 3, 3, 3, 3])
    expect(new Set(run.vaccinationAttempts.map(attempt => attempt.personId)).size).toBe(3)
    expect(run.statesByDay.every(states => states.every(state => state === 'S'))).toBe(true)
  })

  it('never gives none doses or a transmission reduction', () => {
    const run = simulateTrajectory({ ...config, totalVaccines: 100, vaccinesPerDay: 100, vaccineEfficacy: 1 }, line, 'none', 123, [0])
    expect(run.vaccinationAttempts).toEqual([])
    expect(run.metrics.totalInfected).toBe(4)
  })

  it('shares epidemic events regardless of selection draws when efficacy is zero', () => {
    const probabilistic = { ...config, days: 20, transmissionProbability: 0.4, recoveryProbability: 0.17, vaccineEfficacy: 0, totalVaccines: 3, vaccinesPerDay: 1 }
    for (let seed = 0; seed < 20; seed++) {
      const runs = ['none', 'random', 'targeted'].map(strategy => simulateTrajectory(probabilistic, line, strategy as 'none' | 'random' | 'targeted', seed, [0]))
      expect(runs[0].statesByDay).toEqual(runs[1].statesByDay)
      expect(runs[1].statesByDay).toEqual(runs[2].statesByDay)
    }
  })

  it('is independent of edge array order and conserves all four exclusive states', () => {
    const input = { ...config, days: 10, totalVaccines: 2, vaccinesPerDay: 1, transmissionProbability: .4, recoveryProbability: .3 }
    const original = simulateTrajectory(input, line, 'random', 222, [0])
    const reversed = simulateTrajectory(input, { ...line, edges: [...line.edges].reverse().map(edge => ({ ...edge, source: edge.target, target: edge.source })) }, 'random', 222, [0])
    expect(original).toEqual(reversed)
    for (const day of original.timeline) {
      expect(day.susceptible + day.infected + day.recovered + day.vaccinated).toBe(4)
      expect([day.susceptible, day.infected, day.recovered, day.vaccinated].every(n => Number.isInteger(n) && n >= 0)).toBe(true)
    }
  })

  it('chooses random vaccinees across the whole susceptible population without degree preference', () => {
    const counts = [0, 0, 0, 0]
    for (let seed = 0; seed < 2000; seed++) {
      const run = simulateTrajectory({ ...config, days: 1, initialInfected: 0, totalVaccines: 1, vaccinesPerDay: 1 }, line, 'random', seed, [])
      counts[run.vaccinationAttempts[0].personId]++
    }
    // A wide deterministic sanity check catches degree-biased selection without promising exact counts.
    expect(counts.every(count => count > 350 && count < 650)).toBe(true)
  })

  it('shares efficacy events for a person even when vaccination happens on different days', () => {
    const input = { ...config, days: 4, initialInfected: 0, totalVaccines: 4, vaccinesPerDay: 1, vaccineEfficacy: 0.5 }
    const targeted = simulateTrajectory(input, line, 'targeted', 789, [])
    const random = simulateTrajectory(input, line, 'random', 789, [])
    const outcomes = (run: ReturnType<typeof simulateTrajectory>) => [...run.vaccinationAttempts].sort((a, b) => a.personId - b.personId).map(({ personId, success }) => ({ personId, success }))
    expect(outcomes(targeted)).toEqual(outcomes(random))
    expect(targeted.metrics.dosesUsed).toBe(4)
    expect(random.metrics.dosesUsed).toBe(4)
  })

  it('has no action on day 0 even with interventionDay=0, and none after the horizon', () => {
    const input = { ...config, days: 0, interventionDay: 0, totalVaccines: 4, vaccineEfficacy: 1 }
    expect(simulateTrajectory(input, line, 'targeted', 123, [0]).vaccinationAttempts).toEqual([])
    const late = simulateTrajectory({ ...input, days: 3, interventionDay: 4 }, line, 'targeted', 123, [0])
    expect(late.vaccinationAttempts).toEqual([])
    expect(late.metrics.totalInfected).toBe(4)
  })

  it('never infects vaccinated or recovered people, or infects a person twice', () => {
    const triangle: ContactGraph = { ...line, edges: [...line.edges, { source: 0, target: 2, zone: 'home' }] }
    const run = simulateTrajectory({ ...config, days: 8, totalVaccines: 1, vaccinesPerDay: 1, vaccineEfficacy: 1 }, triangle, 'targeted', 123, [0])
    // Person 2 has degree 3; vaccination disconnects person 3 from the outbreak.
    expect(run.statesByDay[8]).toEqual(['R', 'R', 'V', 'S'])
    expect(run.metrics.totalInfected).toBe(2)
    expect(run.timeline[8].totalInfected).toBe(2)
  })

  it('rejects duplicate or invalid contacts and mismatched initial states', () => {
    expect(() => prepareGraph({ ...line, edges: [...line.edges, { source: 1, target: 0, zone: 'home' }] })).toThrow(/duplicado/)
    expect(() => prepareGraph({ ...line, edges: [{ source: 0, target: 0, zone: 'home' }] })).toThrow(/inválido/)
    expect(() => prepareGraph({ ...line, edges: [{ source: 0, target: 4, zone: 'home' }] })).toThrow(/inválido/)
    expect(() => simulateTrajectory(config, line, 'none', 123, [4])).toThrow(/initialInfected/)
    expect(() => simulateTrajectory(config, line, 'none', 123, [])).toThrow(/initialInfected/)
  })

  it('counts a susceptible exposed by two infectives only once and buffers its first transmission', () => {
    const contacts: ContactGraph = { ...line, edges: [
      { source: 0, target: 2, zone: 'home' }, { source: 1, target: 2, zone: 'home' }, { source: 2, target: 3, zone: 'home' },
    ] }
    const run = simulateTrajectory({ ...config, initialInfected: 2, days: 2, recoveryProbability: 0 }, contacts, 'none', 123, [0, 1])
    expect(run.statesByDay).toEqual([['I', 'I', 'S', 'S'], ['I', 'I', 'I', 'S'], ['I', 'I', 'I', 'I']])
    expect(run.timeline.map(day => day.newInfections)).toEqual([0, 1, 1])
    expect(run.metrics.totalInfected).toBe(4)
  })

  it('uses the seed for epidemic outcomes without mutating configuration, graph, or previous snapshots', () => {
    const input = { ...config, transmissionProbability: 0.5, recoveryProbability: 0.5 }
    const inputBefore = JSON.stringify(input)
    const graphBefore = JSON.stringify(line)
    const outcomes = new Set(Array.from({ length: 20 }, (_, seed) =>
      JSON.stringify(simulateTrajectory(input, line, 'none', seed, [0]).statesByDay)))
    expect(outcomes.size).toBeGreaterThan(1)
    expect(JSON.stringify(input)).toBe(inputBefore)
    expect(JSON.stringify(line)).toBe(graphBefore)
    const run = simulateTrajectory(config, line, 'none', 123, [0])
    run.statesByDay[3][0] = 'S'
    expect(run.statesByDay[0]).toEqual(['I', 'S', 'S', 'S'])
  })
})
