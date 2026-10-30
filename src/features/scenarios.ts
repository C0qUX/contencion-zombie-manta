import { DEFAULT_INPUT, validateInput, type SimulationInput } from '../domain/simulation'

export type Draft = Record<keyof SimulationInput, string>
export const toDraft = (input: SimulationInput): Draft => Object.fromEntries(Object.entries(input).map(([key, value]) => [key, String(value)])) as Draft
export function parseDraft(draft: Draft): SimulationInput {
  const input = { ...DEFAULT_INPUT }
  for (const key of Object.keys(DEFAULT_INPUT) as (keyof SimulationInput)[]) {
    if (key === 'outbreakLocation') { input[key] = draft[key] as SimulationInput['outbreakLocation']; continue }
    if (!draft[key]?.trim()) throw new Error(`${key}: completa el campo.`)
    input[key] = Number(draft[key])
  }
  validateInput(input)
  return input
}
export const SCENARIOS = [
  { id: 'oficial', label: 'Brote en mercado · oficial', changes: {} },
  { id: 'colegio', label: 'Brote en colegio', changes: { outbreakLocation: 'colegio' } },
  { id: 'variante', label: 'Variante más contagiosa', changes: { transmissionRate: .68 } },
  { id: 'escasez', label: 'Escasez de vacunas', changes: { vaccinesPerDay: 90, totalVaccines: 7560 } },
  { id: 'eficacia', label: 'Baja eficacia', changes: { vaccineEfficacy: .5 } },
  { id: 'tardia', label: 'Intervención tardía', changes: { interventionDay: 25 } },
] satisfies { id: string; label: string; changes: Partial<SimulationInput> }[]

export function initialScenario(search: string): { input: SimulationInput; notice: string } {
  const encoded = new URLSearchParams(search).get('escenario')
  if (!encoded) return { input: { ...DEFAULT_INPUT }, notice: '' }
  try {
    const parsed: unknown = JSON.parse(encoded)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    const input = { ...DEFAULT_INPUT }
    for (const key of Object.keys(DEFAULT_INPUT) as (keyof SimulationInput)[]) {
      if (key in parsed) Object.assign(input, { [key]: (parsed as Record<string, unknown>)[key] })
    }
    validateInput(input)
    return { input, notice: 'Configuración válida cargada del enlace.' }
  } catch {
    return { input: { ...DEFAULT_INPUT }, notice: 'El enlace contenía una configuración inválida. Se cargó el escenario oficial.' }
  }
}
