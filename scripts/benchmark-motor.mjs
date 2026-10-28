// Manual benchmark; timings stay outside deterministic simulation results.
// Uses the repository's existing Vite runtime to load TypeScript, no extra packages.
import { createServer } from 'vite'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
try {
  const { DEFAULT_CONFIG } = await server.ssrLoadModule('/src/shared/simulation-contract.ts')
  const { runExperiment, ALGORITHM_VERSION } = await server.ssrLoadModule('/src/domain/experiment.ts')
  const config = { ...DEFAULT_CONFIG }
  if (process.argv[2] !== undefined) config.population = Number(process.argv[2])
  if (process.argv[3] !== undefined) config.repetitions = Number(process.argv[3])
  if (process.argv[4] !== undefined) config.days = Number(process.argv[4])
  const started = performance.now()
  const result = runExperiment(config)
  const elapsedMs = performance.now() - started
  const totals = Object.fromEntries(Object.entries(result.strategies).map(([strategy, summary]) => [strategy, summary.totalInfected]))
  console.log(JSON.stringify({ measurement: { elapsedMs, node: process.version }, algorithmVersion: ALGORITHM_VERSION, config: result.config, edges: result.example.graph.edges.length, totalInfected: totals, avoidedVsNone: result.avoidedVsNone, avoidedVsRandom: result.avoidedVsRandom }, null, 2))
} finally {
  await server.close()
}
