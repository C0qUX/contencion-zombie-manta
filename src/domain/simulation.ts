export const LOCATIONS = [
  { id: 'hogares', label: 'Hogares', share: 0.42, centrality: 1 },
  { id: 'colegio', label: 'Colegio', share: 0.18, centrality: 1.18 },
  { id: 'mercado', label: 'Mercado', share: 0.14, centrality: 1.35 },
  { id: 'bus', label: 'Bus', share: 0.12, centrality: 1.48 },
  { id: 'barrio', label: 'Barrio', share: 0.14, centrality: 1.12 },
] as const

export type LocationId = typeof LOCATIONS[number]['id']
export type StrategyId = 'targeted' | 'random' | 'none'

export type SimulationInput = {
  population: number
  initialInfected: number
  days: number
  transmissionRate: number
  recoveryRate: number
  incubationRate: number
  vaccinesPerDay: number
  interventionDay: number
  vaccineEfficacy: number
  seed: number
  runs: number
  outbreakLocation: LocationId
  totalVaccines?: number
  costPerDose?: number
}

export type PolicyMode = 'repartir' | 'concentrar'
// Priority of a place: (1 + spread potential)^spread × connectivity^connectivity × (0.35 + prevalence × active cases).
// 'repartir' multiplies by susceptibles and splits doses proportionally; 'concentrar' fills the top place by batches.
export type Policy = { mode: PolicyMode; spread: number; prevalence: number; connectivity: number }
export type PolicyEvaluation = { policy: Policy; meanAffected: number }
export type PolicySearch = { chosen: Policy; reference: Policy; calibrationRuns: number; candidates: PolicyEvaluation[] }

export const REFERENCE_POLICY: Policy = { mode: 'repartir', spread: 0, prevalence: 12, connectivity: 1 }
export const POLICY_CANDIDATES: Policy[] = (['repartir', 'concentrar'] as const).flatMap(mode =>
  [0, 1, 2, 4].flatMap(spread => [0, 12].flatMap(prevalence => [0, 1].map(connectivity => ({ mode, spread, prevalence, connectivity })))))
export const CALIBRATION_RUNS = 24
// Calibration futures use run indices far above the 300 evaluated runs, so the
// rule is chosen on futures that never enter the reported comparison.
export const CALIBRATION_OFFSET = 1_000_000

export const ALGORITHM_VERSION = 'seir-places-3.0.0'
export const DEFAULT_INPUT: SimulationInput = {
  population: 15000, initialInfected: 35, days: 90, transmissionRate: .34,
  recoveryRate: .16, incubationRate: .22, vaccinesPerDay: 180,
  interventionDay: 6, vaccineEfficacy: .82, seed: 2026, runs: 120,
  outbreakLocation: 'mercado', totalVaccines: 15120, costPerDose: 10,
}

export type DayState = {
  day: number
  susceptible: number
  exposed: number
  infected: number
  recovered: number
  vaccinated: number
}

export type RunResult = {
  timeline: DayState[]
  peakInfected: number
  peakDay: number
  totalAffected: number
  protectedPeople: number
  dosesUsed: number
  dosesAvailable: number
  dosesByLocation: number[]
  firstAllocation: number[]
  finalZones: ZoneState[]
  zonesTimeline?: ZoneState[][]
  dosesTimeline?: number[][]
}

export type AggregateDay = { day: number; mean: number; p10: number; p90: number }

export type StrategySummary = {
  id: StrategyId
  label: string
  timeline: AggregateDay[]
  meanAffected: number
  medianAffected: number
  p10Affected: number
  p90Affected: number
  meanPeak: number
  meanPeakDay: number
  meanProtected: number
  meanDosesUsed: number
  dosesAvailable: number
  minAffected: number
  maxAffected: number
  meanDosesByLocation: number[]
  meanFirstAllocation: number[]
}

export type ComparisonResult = {
  targeted: StrategySummary
  random: StrategySummary
  none: StrategySummary
  savedVsNone: number
  savedVsRandom: number
  impactPercent: number
  config: SimulationInput
  algorithmVersion: string
  pairedVsNone: DifferenceSummary
  pairedVsRandom: DifferenceSummary
  pairedVsReference: DifferenceSummary
  policySearch: PolicySearch
  warnings: string[]
  example: Record<StrategyId, RunResult>
}

export type DifferenceSummary = { mean: number; median: number; p10: number; p90: number; min: number; max: number }

export type ZoneState = { susceptible: number; exposed: number; infected: number; recovered: number; vaccinated: number }
type Random = () => number

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function validateInput(input: SimulationInput): void {
  if (!input || typeof input !== 'object') throw new Error('Se requiere una configuración.')
  const limits: [keyof SimulationInput, number, number][] = [
    ['population', 100, 50000], ['days', 1, 180], ['runs', 1, 300],
    ['initialInfected', 0, input.population], ['vaccinesPerDay', 0, input.population],
    ['interventionDay', 1, input.days + 1], ['seed', 0, 4294967295],
  ]
  for (const [name, min, max] of limits) {
    const value = input[name]
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
      throw new Error(`${name}: entero entre ${min} y ${max}.`)
    }
  }
  for (const name of ['transmissionRate', 'recoveryRate', 'incubationRate', 'vaccineEfficacy'] as const) {
    if (!Number.isFinite(input[name]) || input[name] < 0 || input[name] > 1) throw new Error(`${name}: valor finito entre 0 y 1.`)
  }
  if (input.totalVaccines !== undefined && (!Number.isSafeInteger(input.totalVaccines) || input.totalVaccines < 0 || input.totalVaccines > 1000000)) {
    throw new Error('totalVaccines: entero entre 0 y 1000000.')
  }
  if (input.costPerDose !== undefined && (!Number.isFinite(input.costPerDose) || input.costPerDose < 0 || input.costPerDose > 100000)) {
    throw new Error('costPerDose: valor finito entre 0 y 100000.')
  }
  if (!LOCATIONS.some(location => location.id === input.outbreakLocation)) throw new Error('outbreakLocation: lugar desconocido.')
  const capacity = locationPopulations(input.population)[locationIndex(input.outbreakLocation)]
  if (input.initialInfected > capacity) throw new Error(`initialInfected: el lugar inicial admite como máximo ${capacity} personas.`)
}

export function locationPopulations(population: number): number[] {
  let assigned = 0
  return LOCATIONS.map((location, index) => {
    const size = index === LOCATIONS.length - 1 ? population - assigned : Math.round(population * location.share)
    assigned += size
    return size
  })
}

// A fresh deterministic stream for each run/day/place/event keeps branches in
// one distribution from shifting the random draws of any later event.
function eventRandom(seed: number, run: number, day: number, zone: number, event: number): Random {
  let value = seed >>> 0
  for (const key of [run, day, zone, event]) {
    value = Math.imul(value ^ key ^ 0x9e3779b9, 0x21f0aaad)
    value = Math.imul(value ^ (value >>> 16), 0x735a2d97)
    value = (value ^ (value >>> 15)) >>> 0
  }
  return createRandom(value)
}

// Mulberry32: pequeño, rápido y determinista. No se usa con fines criptográficos.
export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function normal(random: Random) {
  const u = Math.max(Number.EPSILON, random())
  const v = Math.max(Number.EPSILON, random())
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Exacto para grupos pequeños y aproximación normal para grupos grandes.
function binomial(n: number, probability: number, random: Random) {
  const count = Math.max(0, Math.round(n))
  const p = clamp(probability, 0, 1)
  if (count === 0 || p === 0) return 0
  if (p === 1) return count
  if (count <= 80) {
    let successes = 0
    for (let index = 0; index < count; index += 1) successes += random() < p ? 1 : 0
    return successes
  }
  return clamp(Math.round(count * p + normal(random) * Math.sqrt(count * p * (1 - p))), 0, count)
}

function locationIndex(id: LocationId) {
  return Math.max(0, LOCATIONS.findIndex(location => location.id === id))
}

function createZones(input: SimulationInput): ZoneState[] {
  const population = input.population
  const zones = locationPopulations(population).map(size => {
    return { susceptible: size, exposed: 0, infected: 0, recovered: 0, vaccinated: 0 }
  })
  const initial = clamp(Math.round(input.initialInfected), 0, population)
  const origin = locationIndex(input.outbreakLocation)
  const atOrigin = Math.min(initial, zones[origin].susceptible)
  zones[origin].susceptible -= atOrigin
  zones[origin].infected += atOrigin
  let remaining = initial - atOrigin
  for (let index = 0; remaining > 0 && index < zones.length; index += 1) {
    const moved = Math.min(remaining, zones[index].susceptible)
    zones[index].susceptible -= moved
    zones[index].infected += moved
    remaining -= moved
  }
  return zones
}

function totals(zones: ZoneState[], day: number): DayState {
  return zones.reduce<DayState>((sum, zone) => ({
    day,
    susceptible: sum.susceptible + zone.susceptible,
    exposed: sum.exposed + zone.exposed,
    infected: sum.infected + zone.infected,
    recovered: sum.recovered + zone.recovered,
    vaccinated: sum.vaccinated + zone.vaccinated,
  }), { day, susceptible: 0, exposed: 0, infected: 0, recovered: 0, vaccinated: 0 })
}

export const samePolicy = (a: Policy, b: Policy) =>
  a.mode === b.mode && a.spread === b.spread && a.prevalence === b.prevalence && a.connectivity === b.connectivity

export function describePolicy(policy: Policy) {
  return [policy.mode === 'concentrar' ? 'Concentrar por tandas' : 'Repartir proporcional',
    policy.spread ? 'propagación ^' + policy.spread : 'sin propagación',
    policy.prevalence ? 'casos activos ×' + policy.prevalence : 'sin casos activos',
    policy.connectivity ? 'conectividad' : 'sin conectividad'].join(' · ')
}

function validatePolicy(policy: Policy) {
  if (!policy || !['repartir', 'concentrar'].includes(policy.mode)) throw new Error('Política: modo desconocido.')
  for (const value of [policy.spread, policy.prevalence, policy.connectivity]) {
    if (!Number.isFinite(value) || value < 0) throw new Error('Política: pesos finitos y no negativos.')
  }
}

const zonePopulation = (zone: ZoneState) => zone.susceptible + zone.exposed + zone.infected + zone.recovered + zone.vaccinated

// Exposures that one infectious person in place `index` would cause per day,
// up to the common factor transmissionRate, using the same 74/26 mixing as the
// daily step and the susceptibles left after the doses already assigned.
function spreadPotential(zones: ZoneState[], allocation: number[], index: number) {
  const connected = zones.reduce((sum, zone, other) => other === index ? sum
    : sum + (LOCATIONS[index].centrality + LOCATIONS[other].centrality) / 2 * (zone.susceptible - allocation[other]), 0)
  return (0.74 * (zones[index].susceptible - allocation[index]) + 0.26 * connected / Math.max(1, zones.length - 1))
    / Math.max(1, zonePopulation(zones[index]))
}

function priority(zones: ZoneState[], allocation: number[], index: number, policy: Policy) {
  const zone = zones[index]
  const susceptible = zone.susceptible - allocation[index]
  if (susceptible <= 0) return 0
  const prevalence = (zone.infected + zone.exposed * 0.6) / Math.max(1, zonePopulation(zone))
  const weight = Math.pow(LOCATIONS[index].centrality, policy.connectivity)
    * Math.pow(1 + spreadPotential(zones, allocation, index), policy.spread)
    * (0.35 + prevalence * policy.prevalence)
  return policy.mode === 'repartir' ? susceptible * weight : weight
}

function targetedAllocation(zones: ZoneState[], doses: number, policy: Policy) {
  const allocation = zones.map(() => 0)
  let remaining = Math.min(doses, zones.reduce((sum, zone) => sum + zone.susceptible, 0))
  if (policy.mode === 'concentrar') {
    // Twenty batches a day: after each one the priorities see the remaining susceptibles.
    const batch = Math.max(1, Math.ceil(remaining / 20))
    while (remaining > 0) {
      let best = -1, bestScore = 0
      zones.forEach((_, index) => {
        const score = priority(zones, allocation, index, policy)
        if (score > bestScore) { best = index; bestScore = score }
      })
      if (best < 0) break
      const amount = Math.min(batch, remaining, zones[best].susceptible - allocation[best])
      allocation[best] += amount
      remaining -= amount
    }
    return allocation
  }
  const scores = zones.map((_, index) => priority(zones, allocation, index, policy))
  const scoreTotal = scores.reduce((sum, score) => sum + score, 0)
  const target = remaining
  scores.forEach((score, index) => {
    const amount = Math.min(zones[index].susceptible, Math.floor(target * score / Math.max(1, scoreTotal)))
    allocation[index] = amount
    remaining -= amount
  })
  const ranking = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score)
  while (remaining > 0) {
    let changed = false
    for (const item of ranking) {
      if (allocation[item.index] >= zones[item.index].susceptible) continue
      allocation[item.index] += 1
      remaining -= 1
      changed = true
      if (remaining === 0) break
    }
    if (!changed) break
  }
  return allocation
}

export function randomAllocation(zones: ZoneState[], doses: number, random: Random) {
  const allocation = zones.map(() => 0)
  const total = zones.reduce((sum, zone) => sum + zone.susceptible, 0)
  const amount = Math.min(doses, total)
  // Exact sampling without replacement among susceptible individuals. Sampling
  // the excluded set is equivalent and cheaper when almost everyone gets a dose.
  const complement = amount > total / 2
  let eligible = total
  for (let draw = 0; draw < (complement ? total - amount : amount); draw++) {
    let ticket = Math.floor(random() * eligible)
    for (let zone = 0; zone < zones.length; zone++) {
      const available = zones[zone].susceptible - allocation[zone]
      if (ticket < available) { allocation[zone]++; break }
      ticket -= available
    }
    eligible--
  }
  return complement ? zones.map((zone, index) => zone.susceptible - allocation[index]) : allocation
}

export function simulateOnce(input: SimulationInput, strategy: StrategyId, runIndex = 0, policy: Policy = REFERENCE_POLICY, keepMapHistory = false): RunResult {
  validateInput(input)
  validatePolicy(policy)
  if (!['targeted', 'random', 'none'].includes(strategy)) throw new Error('Estrategia desconocida.')
  if (!Number.isSafeInteger(runIndex) || runIndex < 0) throw new Error('Índice de corrida inválido.')
  const safeInput = { ...input }
  const zones = createZones(safeInput)
  const timeline: DayState[] = []
  let totalAffected = Math.round(safeInput.initialInfected)
  let dosesUsed = 0
  const activeDays = strategy === 'none' ? 0 : Math.max(0, safeInput.days - safeInput.interventionDay + 1)
  const dosesAvailable = Math.min(input.totalVaccines ?? Infinity, activeDays * safeInput.vaccinesPerDay)
  const dosesByLocation = zones.map(() => 0)
  let firstAllocation = zones.map(() => 0)
  const zonesTimeline: ZoneState[][] = []
  const dosesTimeline: number[][] = []
  const mapSnapshot = () => {
    if (!keepMapHistory) return
    zonesTimeline.push(zones.map(zone => ({ ...zone })))
    dosesTimeline.push([...dosesByLocation])
  }

  timeline.push(totals(zones, 0))
  mapSnapshot()
  for (let day = 1; day <= safeInput.days; day += 1) {

    if (strategy !== 'none' && day >= safeInput.interventionDay) {
      const allocation = strategy === 'targeted'
        ? targetedAllocation(zones, Math.min(safeInput.vaccinesPerDay, dosesAvailable - dosesUsed), policy)
        : randomAllocation(zones, Math.min(safeInput.vaccinesPerDay, dosesAvailable - dosesUsed), eventRandom(input.seed, runIndex, day, 0, 4))
      if (day === safeInput.interventionDay) firstAllocation = [...allocation]
      allocation.forEach((amount, index) => {
        const protectedPeople = binomial(amount, safeInput.vaccineEfficacy, eventRandom(input.seed, runIndex, day, index, 3))
        zones[index].susceptible -= protectedPeople
        zones[index].vaccinated += protectedPeople
        dosesUsed += amount
        dosesByLocation[index] += amount
      })
    }

    const infectedByZone = zones.map(zone => zone.infected)
    const populations = zones.map(zone => zone.susceptible + zone.exposed + zone.infected + zone.recovered + zone.vaccinated)
    const next = zones.map((zone, index) => {
      const local = infectedByZone[index] / Math.max(1, populations[index])
      const connected = infectedByZone.reduce((sum, infected, other) => {
        if (other === index) return sum
        const link = (LOCATIONS[index].centrality + LOCATIONS[other].centrality) / 2
        return sum + link * infected / Math.max(1, populations[other])
      }, 0) / Math.max(1, zones.length - 1)
      const force = safeInput.transmissionRate * (0.74 * local + 0.26 * connected)
      const newExposed = binomial(zone.susceptible, 1 - Math.exp(-force), eventRandom(input.seed, runIndex, day, index, 0))
      const newInfectious = binomial(zone.exposed, safeInput.incubationRate, eventRandom(input.seed, runIndex, day, index, 1))
      const newRecovered = binomial(zone.infected, safeInput.recoveryRate, eventRandom(input.seed, runIndex, day, index, 2))
      totalAffected += newExposed
      return {
        susceptible: zone.susceptible - newExposed,
        exposed: zone.exposed + newExposed - newInfectious,
        infected: zone.infected + newInfectious - newRecovered,
        recovered: zone.recovered + newRecovered,
        vaccinated: zone.vaccinated,
      }
    })
    next.forEach((zone, index) => { zones[index] = zone })
    timeline.push(totals(zones, day))
    mapSnapshot()
  }

  const peak = timeline.reduce((best, current) => current.infected > best.infected ? current : best)
  return {
    timeline,
    peakInfected: peak.infected,
    peakDay: peak.day,
    totalAffected,
    protectedPeople: timeline.at(-1)?.vaccinated ?? 0,
    dosesUsed,
    dosesAvailable,
    dosesByLocation, firstAllocation, finalZones: zones.map(zone => ({ ...zone })),
    ...(keepMapHistory ? { zonesTimeline, dosesTimeline } : {}),
  }
}

function quantile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * ratio
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower] ?? 0
  return (sorted[lower] ?? 0) + ((sorted[upper] ?? 0) - (sorted[lower] ?? 0)) * (position - lower)
}

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)

function aggregate(id: StrategyId, label: string, runs: RunResult[]): StrategySummary {
  const affected = runs.map(run => run.totalAffected)
  return {
    id,
    label,
    timeline: runs[0].timeline.map((day, index) => {
      const infected = runs.map(run => run.timeline[index].infected)
      return { day: day.day, mean: mean(infected), p10: quantile(infected, 0.1), p90: quantile(infected, 0.9) }
    }),
    meanAffected: mean(affected),
    medianAffected: quantile(affected, 0.5),
    p10Affected: quantile(affected, 0.1),
    p90Affected: quantile(affected, 0.9),
    meanPeak: mean(runs.map(run => run.peakInfected)),
    meanPeakDay: mean(runs.map(run => run.peakDay)),
    meanProtected: mean(runs.map(run => run.protectedPeople)),
    meanDosesUsed: mean(runs.map(run => run.dosesUsed)),
    dosesAvailable: runs[0]?.dosesAvailable ?? 0,
    minAffected: Math.min(...affected), maxAffected: Math.max(...affected),
    meanDosesByLocation: LOCATIONS.map((_, index) => mean(runs.map(run => run.dosesByLocation[index]))),
    meanFirstAllocation: LOCATIONS.map((_, index) => mean(runs.map(run => run.firstAllocation[index]))),
  }
}

export function summarizeDifferences(values: number[]): DifferenceSummary {
  if (!values.length || values.some(value => !Number.isFinite(value))) throw new Error('Muestra de diferencias inválida.')
  return { mean: mean(values), median: quantile(values, .5), p10: quantile(values, .1), p90: quantile(values, .9), min: Math.min(...values), max: Math.max(...values) }
}

export type ProgressPhase = 'calibracion' | 'evaluacion'
export type ProgressCallback = (completed: number, total: number, phase: ProgressPhase) => void

const availableDoses = (input: SimulationInput) =>
  Math.min(input.totalVaccines ?? Infinity, Math.max(0, input.days - input.interventionDay + 1) * input.vaccinesPerDay)

// Bounded search: every candidate rule faces the same calibration futures and
// the lowest mean of cumulative infections wins; ties keep the reference rule.
export function searchPolicy(input: SimulationInput, onCandidate?: (completed: number, total: number) => void): PolicySearch {
  validateInput(input)
  if (availableDoses(input) === 0 || input.vaccineEfficacy === 0) {
    return { chosen: REFERENCE_POLICY, reference: REFERENCE_POLICY, calibrationRuns: 0, candidates: [] }
  }
  const candidates = POLICY_CANDIDATES.map((policy, index) => {
    let affected = 0
    for (let run = 0; run < CALIBRATION_RUNS; run += 1) affected += simulateOnce(input, 'targeted', CALIBRATION_OFFSET + run, policy).totalAffected
    onCandidate?.(index + 1, POLICY_CANDIDATES.length)
    return { policy, meanAffected: affected / CALIBRATION_RUNS }
  })
  const best = candidates.reduce((current, candidate) => candidate.meanAffected < current.meanAffected ? candidate : current,
    candidates.find(candidate => samePolicy(candidate.policy, REFERENCE_POLICY))!)
  return { chosen: best.policy, reference: REFERENCE_POLICY, calibrationRuns: CALIBRATION_RUNS, candidates }
}

export function compareStrategies(input: SimulationInput, onProgress?: ProgressCallback): ComparisonResult {
  validateInput(input)
  input = { ...input }
  const runCount = input.runs
  const searching = availableDoses(input) > 0 && input.vaccineEfficacy > 0
  const calibrationTotal = searching ? POLICY_CANDIDATES.length * CALIBRATION_RUNS : 0
  const total = calibrationTotal + runCount * 4
  const policySearch = searchPolicy(input, completed => onProgress?.(completed * CALIBRATION_RUNS, total, 'calibracion'))
  const reuseReference = samePolicy(policySearch.chosen, REFERENCE_POLICY)
  const strategies: Record<StrategyId, RunResult[]> = { targeted: [], random: [], none: [] }
  const reference: RunResult[] = []
  for (let run = 0; run < runCount; run += 1) {
    strategies.targeted.push(simulateOnce(input, 'targeted', run, policySearch.chosen, run === 0))
    strategies.random.push(simulateOnce(input, 'random', run, REFERENCE_POLICY, run === 0))
    strategies.none.push(simulateOnce(input, 'none', run, REFERENCE_POLICY, run === 0))
    reference.push(reuseReference ? strategies.targeted[run] : simulateOnce(input, 'targeted', run, REFERENCE_POLICY))
    onProgress?.(calibrationTotal + (run + 1) * 4, total, 'evaluacion')
  }
  const targeted = aggregate('targeted', '7DaysToSurvive', strategies.targeted)
  const random = aggregate('random', 'Intervención al azar', strategies.random)
  const none = aggregate('none', 'No intervenir', strategies.none)
  const pairedVsNone = summarizeDifferences(strategies.none.map((run, index) => run.totalAffected - strategies.targeted[index].totalAffected))
  const pairedVsRandom = summarizeDifferences(strategies.random.map((run, index) => run.totalAffected - strategies.targeted[index].totalAffected))
  const pairedVsReference = summarizeDifferences(reference.map((run, index) => run.totalAffected - strategies.targeted[index].totalAffected))
  const savedVsNone = pairedVsNone.mean
  const savedVsRandom = pairedVsRandom.mean
  return {
    targeted,
    random,
    none,
    savedVsNone,
    savedVsRandom,
    impactPercent: none.meanAffected ? savedVsNone / none.meanAffected * 100 : 0,
    config: { ...input }, algorithmVersion: ALGORITHM_VERSION, pairedVsNone, pairedVsRandom, pairedVsReference, policySearch,
    example: { targeted: strategies.targeted[0], random: strategies.random[0], none: strategies.none[0] },
    warnings: [
      'Población, lugares y parámetros sintéticos; sin calibración sanitaria de Manta.',
      'P10–P90 describe variabilidad de corridas, no un intervalo de confianza de la media.',
      'La regla dirigida es la mejor de ' + POLICY_CANDIDATES.length + ' candidatas en futuros de calibración, no un óptimo global; puede perder frente al azar.',
      ...(input.runs < 30 ? ['Menos de 30 corridas: percentiles inestables.'] : []),
      ...(input.interventionDay > input.days ? ['La intervención empieza fuera del horizonte.'] : []),
    ],
  }
}
