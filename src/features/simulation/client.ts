import type { ExperimentConfig, WorkerRequest, WorkerResponse } from '../../shared/simulation-contract'

export interface SimulationWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  onmessageerror: ((event: MessageEvent) => void) | null
  postMessage(request: WorkerRequest): void
  terminate(): void
}

let sequence = 0
export function createSimulationClient(
  receive: (response: WorkerResponse) => void,
  createWorker: () => SimulationWorker = () => new Worker(new URL('../../workers/simulation.worker.ts', import.meta.url), { type: 'module' }),
) {
  let active: { worker: SimulationWorker; requestId: string } | undefined
  const cancel = () => {
    if (!active) return
    const { worker } = active
    active = undefined
    worker.onmessage = null
    worker.onerror = null
    worker.onmessageerror = null
    worker.terminate()
  }
  const run = (config: ExperimentConfig) => {
    cancel()
    const requestId = `experiment-${++sequence}`
    try {
      const worker = createWorker()
      active = { worker, requestId }
      const fail = (message: string) => {
        if (active?.requestId !== requestId) return
        cancel()
        receive({ type: 'error', requestId, message })
      }
      worker.onmessage = ({ data }) => {
        if (active?.requestId !== requestId || data.requestId !== requestId) return
        if (data.type !== 'progress') cancel()
        receive(data)
      }
      worker.onerror = event => {
        event.preventDefault()
        fail('No se pudo ejecutar la simulación. Vuelve a intentarlo; si persiste, recarga la página.')
      }
      worker.onmessageerror = () => fail('No se pudo leer el resultado de la simulación. Vuelve a ejecutar.')
      worker.postMessage({ type: 'run', requestId, config: { ...config } })
    } catch (error) {
      cancel()
      receive({ type: 'error', requestId, message: error instanceof Error ? error.message : 'No se pudo iniciar la simulación.' })
    }
    return requestId
  }
  return { run, cancel }
}
