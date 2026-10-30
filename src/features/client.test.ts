import { expect, it, vi } from 'vitest'
import { DEFAULT_INPUT } from '../domain/simulation'
import { createClient, type SimulationWorker, type WorkerResponse } from './client'
const worker = (): SimulationWorker => ({ onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() })
it('terminates a cancelled Worker and ignores its late messages', () => {
  const receive = vi.fn(), first = worker(), second = worker()
  const factory = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
  const client = createClient(receive, factory)
  client.run(DEFAULT_INPUT)
  const stale = first.onmessage!
  client.cancel(); client.run(DEFAULT_INPUT)
  stale({ data: { id: 1, type: 'progress', completed: 1, total: 120, phase: 'evaluacion' } } as MessageEvent<WorkerResponse>)
  expect(first.terminate).toHaveBeenCalledOnce()
  expect(receive).not.toHaveBeenCalled()
  second.onmessage!({ data: { id: 2, type: 'error', message: 'real' } } as MessageEvent<WorkerResponse>)
  expect(receive).toHaveBeenCalledWith({ id: 2, type: 'error', message: 'real' })
  expect(second.terminate).toHaveBeenCalledOnce()
})
it('reports startup failure instead of leaving the UI running forever', () => {
  const receive = vi.fn()
  createClient(receive, () => { throw new Error('Worker bloqueado') }).run(DEFAULT_INPUT)
  expect(receive).toHaveBeenCalledWith({ id: 1, type: 'error', message: 'Worker bloqueado' })
})
