import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG, type WorkerResponse, type WorkerRequest } from '../../shared/simulation-contract'
import { createSimulationClient, type SimulationWorker } from './client'

// The browser Worker is unavailable in Vitest's node environment. Only transport
// is replaced; request isolation, lifecycle and callbacks use the real client.
function transport() {
  const workers: (SimulationWorker & { request?: WorkerRequest; terminated: boolean })[] = []
  const create = () => {
    const worker: typeof workers[number] = {
      terminated: false, onmessage: null, onerror: null, onmessageerror: null,
      postMessage(request) { worker.request = request },
      terminate() { worker.terminated = true },
    }
    workers.push(worker)
    return worker
  }
  return { workers, create }
}

describe('simulation client lifecycle', () => {
  it('isolates a new run from queued messages belonging to an old worker', () => {
    const { workers, create } = transport()
    const receive = vi.fn()
    const client = createSimulationClient(receive, create)
    client.run(DEFAULT_CONFIG)
    const oldMessage = workers[0].onmessage!
    const firstId = workers[0].request!.requestId
    client.run({ ...DEFAULT_CONFIG, seed: 8 })
    const secondId = workers[1].request!.requestId
    expect(firstId).not.toBe(secondId)
    expect(workers[0].terminated).toBe(true)
    const progress: WorkerResponse = { type: 'progress', requestId: firstId, progress: { completed: 1, total: 50 } }
    oldMessage(new MessageEvent('message', { data: progress }))
    workers[1].onmessage!(new MessageEvent('message', { data: progress }))
    expect(receive).not.toHaveBeenCalled()
    workers[1].onmessage!(new MessageEvent('message', { data: { ...progress, requestId: secondId } }))
    expect(receive).toHaveBeenCalledOnce()
    client.cancel()
    expect(workers[1].terminated).toBe(true)
  })
  it('cancels synchronously and recreates the worker for a retry after an error', () => {
    const { workers, create } = transport()
    const receive = vi.fn()
    const client = createSimulationClient(receive, create)
    client.run(DEFAULT_CONFIG)
    const pending = workers[0].onmessage!
    client.cancel()
    pending(new MessageEvent('message', { data: { type: 'progress', requestId: workers[0].request!.requestId, progress: { completed: 50, total: 50 } } }))
    expect(receive).not.toHaveBeenCalled()
    client.run(DEFAULT_CONFIG)
    workers[1].onerror!(new Event('error') as ErrorEvent)
    expect(receive.mock.calls[0][0].type).toBe('error')
    expect(workers[1].terminated).toBe(true)
    client.run(DEFAULT_CONFIG)
    expect(workers).toHaveLength(3)
    client.cancel()
  })
})
