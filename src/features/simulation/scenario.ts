import { deriveNetworkSeed, generateGraph } from '../../domain/graph'
import { DEFAULT_CONFIG, type ExperimentConfig, type Statistics, type Strategy } from '../../shared/simulation-contract'

export type Draft = Record<keyof ExperimentConfig, string>
export type FieldErrors = Partial<Record<keyof ExperimentConfig, string>>
export type Surprise = 'contagion' | 'stock' | 'market' | 'variant'
export const STRATEGIES: Strategy[] = ['none', 'random', 'targeted']
export const STRATEGY_NAMES: Record<Strategy, string> = {
  none: 'Sin intervenir', random: 'Vacunación al azar', targeted: 'Vacunación por contactos',
}
export const formatNumber = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 3 }).format(value)

export function configToDraft(config: ExperimentConfig): Draft {
  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, String(value)])) as Draft
}

export function parseDraft(draft: Draft): { config?: ExperimentConfig; errors: FieldErrors } {
  const errors: FieldErrors = {}
  const config = { ...DEFAULT_CONFIG }
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof ExperimentConfig)[]) {
    if (key === 'initialZone') continue
    const value = Number(draft[key])
    const probability = ['transmissionProbability', 'recoveryProbability', 'vaccineEfficacy'].includes(key)
    const limits: Partial<Record<keyof ExperimentConfig, [number, number]>> = {
      population: [50, 1000], days: [1, 60], repetitions: [1, 200],
      initialInfected: [1, Number(draft.population)], vaccinesPerDay: [0, Number(draft.population)],
      totalVaccines: [0, Number(draft.population)], interventionDay: [1, Number(draft.days) + 1], seed: [0, 4294967295],
    }
    const [min, max] = probability ? [0, 1] : limits[key]!
    if (!draft[key].trim() || !Number.isFinite(value) || (!probability && !Number.isSafeInteger(value)) || value < min || value > max) {
      errors[key] = `${probability ? 'Valor' : 'Entero'} entre ${min} y ${max}.`
    } else config[key] = value
  }
  if (!['random', 'home', 'school', 'market', 'transport'].includes(draft.initialZone)) {
    errors.initialZone = 'Selecciona una zona válida.'
  } else config.initialZone = draft.initialZone as ExperimentConfig['initialZone']
  // Reuse the real graph generator to validate capacity; no Monte Carlo is run.
  if (Object.keys(errors).length === 0 && config.initialZone !== 'random') {
    const graph = generateGraph(config.population, deriveNetworkSeed(config.seed))
    const zone = config.initialZone
    const capacity = graph.nodes.filter(node => node.zones.includes(zone)).length
    if (config.initialInfected > capacity) errors.initialInfected = `Esta zona tiene ${capacity} personas elegibles; reduce los infectados iniciales o selecciona toda la población.`
  }
  return Object.keys(errors).length ? { errors } : { config, errors }
}

export function applySurprise(draft: Draft, action: Surprise): { draft: Draft; message: string } {
  const next = { ...draft }
  if (action === 'market') {
    next.initialZone = 'market'
    return { draft: next, message: `Zona inicial: ${draft.initialZone} → market (mercado). Infectados iniciales: ${draft.initialInfected}, sin cambios.` }
  }
  if (action === 'variant') {
    next.vaccineEfficacy = '0.5'
    return { draft: next, message: `Eficacia: ${draft.vaccineEfficacy} → 0.5 (50 %).` }
  }
  const key = action === 'contagion' ? 'transmissionProbability' : 'totalVaccines'
  const value = Number(draft[key])
  if (!draft[key].trim() || !Number.isFinite(value) || value < 0 || (action === 'contagion' ? value > 1 : !Number.isInteger(value))) {
    return { draft, message: `Corrige ${action === 'contagion' ? 'el contagio' : 'el stock'} antes de aplicar este cambio.` }
  }
  next[key] = String(action === 'contagion' ? Math.min(1, value * 2) : Math.floor(value / 2))
  return { draft: next, message: action === 'contagion'
    ? `Contagio por contacto/día: ${draft[key]} → ${next[key]}.${value * 2 >= 1 ? ' Se alcanzó el máximo de 1.' : ''}`
    : `Stock total: ${draft[key]} → ${next[key]} dosis. Dosis diarias: ${draft.vaccinesPerDay}, sin cambios.` }
}

export function recommendation(stats: Statistics): string {
  const comparison = stats.mean > 0
    ? `${formatNumber(stats.mean)} contagios evitados en promedio`
    : stats.mean < 0 ? `${formatNumber(-stats.mean)} contagios más en promedio` : 'las dos estrategias empatan en promedio'
  return `${comparison}; diferencias pareadas P10–P90: ${formatNumber(stats.p10)} a ${formatNumber(stats.p90)}. ${stats.min < 0 ? 'Hubo repeticiones en las que priorizar por contactos perdió.' : 'Este resultado no garantiza una mejora en otros escenarios.'}`
}
