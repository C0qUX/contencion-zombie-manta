import type { ComparisonResult, SimulationInput } from '../domain/simulation'
export type WorkerRequest = { id: number; input: SimulationInput }
export type WorkerResponse = { id: number } & (
  | { type: 'progress'; completed: number; total: number }
  | { type: 'result'; result: ComparisonResult }
  | { type: 'error'; message: string }
)
export interface SimulationWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent) => void) | null
  postMessage(request: WorkerRequest): void
  terminate(): void
}
export function createClient(receive: (message: WorkerResponse) => void,
  factory: () => SimulationWorker = () => new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), { type: 'module' })) {
  let sequence = 0
  let active: { id: number; worker: SimulationWorker } | undefined
  const cancel = () => {
    if (!active) return
    const worker = active.worker
    active = undefined
    worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null
    worker.terminate()
  }
  const run = (input: SimulationInput) => {
    cancel()
    const id = ++sequence
    try {
      const worker = factory()
      active = { id, worker }
      const fail = () => {
        if (active?.id !== id) return
        cancel(); receive({ id, type: 'error', message: 'No se pudo ejecutar el Worker. Reintenta o recarga la página.' })
      }
      worker.onmessage = ({ data }) => {
        if (active?.id !== id || data.id !== id) return
        if (data.type !== 'progress') cancel()
        receive(data)
      }
      worker.onerror = event => { event.preventDefault(); fail() }
      worker.onmessageerror = fail
      worker.postMessage({ id, input: { ...input } })
    } catch (error) {
      cancel(); receive({ id, type: 'error', message: error instanceof Error ? error.message : 'Error al iniciar el cálculo.' })
    }
  }
  return { run, cancel }
}
