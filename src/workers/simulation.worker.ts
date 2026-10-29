import { runExperiment } from '../domain/experiment'
import type { WorkerRequest, WorkerResponse } from '../shared/simulation-contract'

const send = (response: WorkerResponse) => self.postMessage(response)
self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type !== 'run') return
  const { requestId, config } = data
  try {
    const result = runExperiment(config, progress => send({ type: 'progress', requestId, progress }))
    send({ type: 'result', requestId, result })
  } catch (error) {
    send({ type: 'error', requestId, message: error instanceof Error ? error.message : 'No se pudo completar el experimento.' })
  }
}
