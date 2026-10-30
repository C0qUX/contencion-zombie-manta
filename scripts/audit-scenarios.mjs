import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
try {
  const { compareStrategies, describePolicy, DEFAULT_INPUT, ALGORITHM_VERSION, POLICY_CANDIDATES, CALIBRATION_RUNS } = await server.ssrLoadModule('/src/domain/simulation.ts')
  const { SCENARIOS } = await server.ssrLoadModule('/src/features/scenarios.ts')
  const seeds = [2026, 42, 12345, 98765, 314159]
  const variants = [...SCENARIOS,
    { id: 'capacidad-mitad', changes: { vaccinesPerDay: 90 } },
    { id: 'transporte', changes: { outbreakLocation: 'bus' } },
  ]
  const started = performance.now()
  const experiments = []
  for (const variant of variants) for (const seed of seeds) {
    const result = compareStrategies({ ...DEFAULT_INPUT, ...variant.changes, seed })
    experiments.push({
      scenario: variant.id, config: result.config,
      strategies: [result.targeted, result.random, result.none].map(item => ({
        strategy: item.id, meanAffected: item.meanAffected, medianAffected: item.medianAffected, p10: item.p10Affected, p90: item.p90Affected,
        meanPeak: item.meanPeak, meanPeakDay: item.meanPeakDay, dosesUsed: item.meanDosesUsed, dosesAvailable: item.dosesAvailable,
      })), pairedVsNone: result.pairedVsNone, pairedVsRandom: result.pairedVsRandom,
      policy: describePolicy(result.policySearch.chosen), pairedVsReference: result.pairedVsReference,
    })
  }
  // A separate edge-case search checks preservation of losses; never changes defaults.
  let negativeExample
  for (let seed = 0; seed < 200 && !negativeExample; seed++) {
    const result = compareStrategies({ ...DEFAULT_INPUT, population: 100, initialInfected: 1, days: 30, runs: 1, totalVaccines: 10, vaccinesPerDay: 2, seed })
    if (result.savedVsRandom < 0) negativeExample = { config: result.config, savedVsRandom: result.savedVsRandom }
  }
  const record = { algorithmVersion: ALGORITHM_VERSION, design: { seeds, scenarios: variants.map(item => item.id), runs: DEFAULT_INPUT.runs, policyCandidates: POLICY_CANDIDATES.length, calibrationRuns: CALIBRATION_RUNS, chosenBeforeExecution: true }, measurement: { node: process.version, platform: process.platform, elapsedMs: performance.now() - started }, experiments, negativeExample }
  await mkdir('docs/evidencia', { recursive: true })
  await writeFile('docs/evidencia/sensibilidad.json', JSON.stringify(record, null, 2) + '\n')
  console.log(JSON.stringify({ experiments: experiments.length, default: experiments[0], negativeExample, elapsedMs: record.measurement.elapsedMs }, null, 2))
} finally { await server.close() }
