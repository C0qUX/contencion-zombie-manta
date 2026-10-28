import { describe, expect, it } from 'vitest'
import { CONTRACT_VERSION, DEFAULT_CONFIG, type ExperimentProgress, type RunExperiment } from '../shared/simulation-contract'
import { runExperiment } from './experiment'
import { generateGraph } from './graph'
import { runPairedRepetition, STRATEGIES } from './paired'

const config = { ...DEFAULT_CONFIG, population: 20, days: 6, repetitions: 5, seed: 42 }

describe('runExperiment shared contract', () => {
  it('exports the exact agreed signature and a completely deterministic cloneable result', () => {
    const run: RunExperiment = runExperiment
    const result = run(config)
    expect(result.contractVersion).toBe(CONTRACT_VERSION)
    expect(result).toEqual(run(config))
    expect(result).toEqual(structuredClone(result))
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    expect(Object.keys(result).sort()).toEqual(['avoidedVsNone', 'avoidedVsRandom', 'config', 'contractVersion', 'example', 'strategies', 'warnings'])
    expect(result.config).toEqual(config)
    expect(result.config).not.toBe(config)
  })

  it('reports progress only after completing all three strategies in a repetition', () => {
    const events: ExperimentProgress[] = []
    const withProgress = runExperiment(config, progress => events.push(progress))
    expect(events).toEqual([1, 2, 3, 4, 5].map(completed => ({ completed, total: 5 })))
    expect(withProgress).toEqual(runExperiment(config))
  })

  it('preserves configuration even if a progress subscriber mutates its original input', () => {
    const original = { ...config }
    const expected = runExperiment(config)
    const actual = runExperiment(original, progress => {
      original.seed = 123456
      original.repetitions = 1
      progress.total = 0
    })
    expect(actual).toEqual(expected)
  })

  it('always illustrates repetition 0 and exposes replayable network and trial seeds', () => {
    const result = runExperiment(config)
    const graph = generateGraph(config.population, result.example.networkSeed)
    expect(result.example.repetition).toBe(0)
    expect(result.example.graph).toEqual(graph)
    const first = runPairedRepetition(config, graph, 0)
    expect(result.example.trialSeed).toBe(first.seed)
    for (const strategy of STRATEGIES) {
      const snapshots = result.example.timelines[strategy]
      expect(snapshots).toHaveLength(7)
      for (const snapshot of snapshots) {
        expect(Object.keys(snapshot).sort()).toEqual(['cumulativeInfected', 'day', 'dosesUsed', 'infected', 'recovered', 'states', 'susceptible', 'vaccinated'])
        expect(snapshot.states).toEqual(first.strategies[strategy].statesByDay[snapshot.day])
        expect(snapshot.states).toHaveLength(20)
        expect(snapshot.susceptible + snapshot.infected + snapshot.recovered + snapshot.vaccinated).toBe(20)
        expect(snapshot.cumulativeInfected).toBe(snapshot.infected + snapshot.recovered)
      }
    }
  })

  it('summarizes cumulative cases, active daily infections, per-run peaks and consumed attempts separately', () => {
    const result = runExperiment({ ...config, initialInfected: 2, initialZone: 'random', transmissionProbability: 0, recoveryProbability: 1, vaccineEfficacy: 0, totalVaccines: 7, vaccinesPerDay: 3 })
    const zero = { mean: 0, min: 0, p10: 0, p90: 0, max: 0 }
    const two = { mean: 2, min: 2, p10: 2, p90: 2, max: 2 }
    const seven = { mean: 7, min: 7, p10: 7, p90: 7, max: 7 }
    for (const strategy of STRATEGIES) {
      expect(result.strategies[strategy]).toEqual({
        strategy, totalInfected: two, peakInfected: two, dosesUsed: strategy === 'none' ? zero : seven,
        daily: Array.from({ length: 7 }, (_, day) => ({ day, infected: day === 0 ? two : zero })),
      })
    }
    expect(result.avoidedVsNone).toEqual(zero)
    expect(result.avoidedVsRandom).toEqual(zero)
    expect(result.example.timelines.targeted[6].vaccinated).toBe(0)
    expect(result.example.timelines.targeted[6].dosesUsed).toBe(7)
  })

  it('has one initial point at days=0 and degenerate statistics for one repetition', () => {
    const result = runExperiment({ ...config, days: 0, repetitions: 1 })
    for (const strategy of STRATEGIES) {
      expect(result.strategies[strategy].daily).toEqual([{ day: 0, infected: { mean: 1, min: 1, p10: 1, p90: 1, max: 1 } }])
      expect(result.example.timelines[strategy]).toHaveLength(1)
      expect(result.strategies[strategy].dosesUsed.max).toBe(0)
    }
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('keeps a negative paired outcome when random beats targeted, without swapping the baselines', () => {
    const result = runExperiment({
      ...DEFAULT_CONFIG, population: 4, days: 4, repetitions: 5, seed: 2026, initialZone: 'random',
      transmissionProbability: .5, recoveryProbability: .5, vaccinesPerDay: 1, totalVaccines: 1, vaccineEfficacy: 1,
    })
    // Complete four-person graph. Totals (none/random/targeted) by repetition:
    // (4/3/3), (4/1/3), (4/3/3), (4/2/3), (4/3/1).
    // Paired differences: none [1,1,1,1,3], random [0,-2,0,-1,2].
    expect(result.avoidedVsNone).toEqual({ mean: 1.4, min: 1, p10: 1, p90: 3, max: 3 })
    expect(result.avoidedVsRandom).toEqual({ mean: -.2, min: -2, p10: -2, p90: 2, max: 2 })
    expect(result.example.repetition).toBe(0)
    expect(result.example.timelines.random[4].cumulativeInfected).toBe(3)
    expect(result.example.timelines.targeted[4].cumulativeInfected).toBe(3)
  })

  it('aggregates each individual peak rather than taking the peak of the average curve', () => {
    const result = runExperiment({
      ...DEFAULT_CONFIG, population: 8, days: 8, repetitions: 5, seed: 2026, initialZone: 'random',
      transmissionProbability: .3, recoveryProbability: .4,
    })
    const none = result.strategies.none
    expect(none.peakInfected).toEqual({ mean: 4.6, min: 1, p10: 1, p90: 7, max: 7 })
    expect(none.daily.map(day => day.infected.mean)).toEqual([1, 1.4, 3.4, 3.8, 3.4, 2.8, 1.8, 1, .8])
    expect(Math.max(...none.daily.map(day => day.infected.mean))).toBe(3.8)
  })

  it('reports invalid inputs and insufficient initial zone candidates before any completed repetition', () => {
    const progress: ExperimentProgress[] = []
    expect(() => runExperiment({ ...config, repetitions: 0 }, event => progress.push(event))).toThrow(/repetitions/)
    expect(() => runExperiment({ ...config, population: 4, initialInfected: 4, initialZone: 'market' }, event => progress.push(event))).toThrow(/market/)
    expect(progress).toEqual([])
  })
})
