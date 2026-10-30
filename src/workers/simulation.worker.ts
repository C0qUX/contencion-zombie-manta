import { compareStrategies } from '../domain/simulation'
import type { WorkerRequest, WorkerResponse } from '../features/client'
const send = (message: WorkerResponse) => self.postMessage(message)
self.onmessage = ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    const result = compareStrategies(data.input, (completed, total) => send({ id: data.id, type: 'progress', completed, total }))
    send({ id: data.id, type: 'result', result })
  } catch (error) {
    send({ id: data.id, type: 'error', message: error instanceof Error ? error.message : 'Configuración inválida.' })
  }
}
