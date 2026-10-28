// Contrato propuesto v1 para 7DaysToSurvive. No es el motor implementado.
// Destino al incorporarlo: src/shared/simulation-contract.ts
// Cambios coordinados por el integrador; ambos roles consumen esta misma versión.
export const CONTRACT_VERSION = '1.0.0' as const
export type Zone = 'home' | 'school' | 'market' | 'transport'
export type Strategy = 'none' | 'random' | 'targeted'
export type HealthState = 'S' | 'I' | 'R' | 'V'

export interface ExperimentConfig {
  population: number
  days: number
  initialInfected: number
  transmissionProbability: number
  recoveryProbability: number
  vaccinesPerDay: number
  totalVaccines: number
  interventionDay: number
  vaccineEfficacy: number
  initialZone: Zone | 'random'
  seed: number
  repetitions: number
}

export const DEFAULT_CONFIG: ExperimentConfig = {
  population: 400,
  days: 30,
  initialInfected: 1,
  transmissionProbability: 0.08,
  recoveryProbability: 0.2,
  vaccinesPerDay: 20,
  totalVaccines: 80,
  interventionDay: 1,
  vaccineEfficacy: 0.9,
  initialZone: 'market',
  seed: 2026,
  repetitions: 50,
}

export interface Person {
  id: number // Contiguo: 0..population-1; índice en states y nodes.
  zones: Zone[] // Lugares donde tiene contactos; no son coordenadas reales.
}
export interface Contact {
  source: number
  target: number
  zone: Zone
}
export interface ContactGraph {
  nodes: Person[]
  edges: Contact[] // No dirigido, sin bucles ni pares duplicados.
}

export interface Statistics {
  mean: number
  min: number
  p10: number
  p90: number
  max: number
}
export interface DailyAggregate {
  day: number
  infected: Statistics
}
export interface StrategySummary {
  strategy: Strategy
  totalInfected: Statistics // Infectados acumulados; incluye los iniciales.
  peakInfected: Statistics // Pico por ejecución, luego agregado.
  dosesUsed: Statistics // Intentos de vacunación, incluso si fallan.
  daily: DailyAggregate[] // days+1 puntos; día 0 es el estado inicial.
}
export interface DaySnapshot {
  day: number
  susceptible: number
  infected: number
  recovered: number
  vaccinated: number // Inmunizados por vacuna eficaz.
  cumulativeInfected: number
  dosesUsed: number // Acumuladas hasta ese día.
  states: HealthState[] // Longitud population; solo para la repetición ilustrada.
}
export interface ExperimentResult {
  contractVersion: typeof CONTRACT_VERSION
  config: ExperimentConfig
  strategies: Record<Strategy, StrategySummary>
  avoidedVsNone: Statistics // Diferencia pareada: none.totalInfected - targeted.totalInfected.
  avoidedVsRandom: Statistics // Diferencia pareada: random.totalInfected - targeted.totalInfected.
  example: {
    repetition: number // Siempre 0; no seleccionar el caso que más favorezca la estrategia.
    networkSeed: number
    trialSeed: number
    graph: ContactGraph
    timelines: Record<Strategy, DaySnapshot[]>
  }
  warnings: string[]
}
export interface ExperimentProgress {
  completed: number // Repeticiones completas, con sus tres estrategias.
  total: number
}
export type ProgressCallback = (progress: ExperimentProgress) => void
export type RunExperiment = (
  config: ExperimentConfig,
  onProgress?: ProgressCallback,
) => ExperimentResult

// El rol motor exporta runExperiment con esta firma desde src/domain/experiment.ts.
// El rol interfaz ejecuta esa función dentro del Worker y usa este protocolo.
export type WorkerRequest = {
  type: 'run'
  requestId: string
  config: ExperimentConfig
}
export type WorkerResponse =
  | { type: 'progress'; requestId: string; progress: ExperimentProgress }
  | { type: 'result'; requestId: string; result: ExperimentResult }
  | { type: 'error'; requestId: string; message: string }
