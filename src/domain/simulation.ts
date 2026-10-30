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
}

export type AggregateDay = { day: number; mean: number; p10: number; p90: number }

export type StrategySummary = {
  id: StrategyId
  label: string
  timeline: AggregateDay[]
  meanAffected: number
  p10Affected: number
  p90Affected: number
  meanPeak: number
  meanPeakDay: number
  meanProtected: number
  meanDosesUsed: number
  dosesAvailable: number
}

export type ComparisonResult = {
  targeted: StrategySummary
  random: StrategySummary
  none: StrategySummary
  savedVsNone: number
  savedVsRandom: number
  impactPercent: number
}

type ZoneState = { susceptible: number; exposed: number; infected: number; recovered: number; vaccinated: number }
type Random = () => number

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

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
  const population = Math.max(1, Math.round(input.population))
  let assigned = 0
  const zones = LOCATIONS.map((location, index) => {
    const size = index === LOCATIONS.length - 1 ? population - assigned : Math.round(population * location.share)
    assigned += size
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

function targetedAllocation(zones: ZoneState[], doses: number) {
  const allocation = zones.map(() => 0)
  let remaining = Math.min(doses, zones.reduce((sum, zone) => sum + zone.susceptible, 0))
  const scores = zones.map((zone, index) => {
    const population = zone.susceptible + zone.exposed + zone.infected + zone.recovered + zone.vaccinated
    const prevalence = (zone.infected + zone.exposed * 0.6) / Math.max(1, population)
    return zone.susceptible * LOCATIONS[index].centrality * (0.35 + prevalence * 12)
  })
  const scoreTotal = scores.reduce((sum, score) => sum + score, 0)
  const target = remaining
  scores.forEach((score, index) => {
    const amount = Math.min(zones[index].susceptible, Math.floor(target * score / Math.max(1, scoreTotal)))
    allocation[index] = amount
    remaining -= amount
  })
  const priority = scores.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score)
  while (remaining > 0) {
    let changed = false
    for (const item of priority) {
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

function randomAllocation(zones: ZoneState[], doses: number, random: Random) {
  const allocation = zones.map(() => 0)
  let remaining = Math.min(doses, zones.reduce((sum, zone) => sum + zone.susceptible, 0))
  let eligible = zones.reduce((sum, zone) => sum + zone.susceptible, 0)
  for (let index = 0; index < zones.length; index += 1) {
    if (remaining === 0) break
    const available = zones[index].susceptible
    const amount = index === zones.length - 1
      ? Math.min(remaining, available)
      : Math.min(remaining, available, binomial(remaining, available / Math.max(1, eligible), random))
    allocation[index] = amount
    remaining -= amount
    eligible -= available
  }
  for (let index = 0; remaining > 0 && index < zones.length; index += 1) {
    const amount = Math.min(remaining, zones[index].susceptible - allocation[index])
    allocation[index] += amount
    remaining -= amount
  }
  return allocation
}

export function simulateOnce(input: SimulationInput, strategy: StrategyId, runIndex = 0): RunResult {
  const safeInput = {
    ...input,
    days: clamp(Math.round(input.days), 1, 365),
    interventionDay: clamp(Math.round(input.interventionDay), 0, Math.round(input.days)),
    vaccinesPerDay: Math.max(0, Math.round(input.vaccinesPerDay)),
    vaccineEfficacy: clamp(input.vaccineEfficacy, 0, 1),
  }
  const diseaseRandom = createRandom((safeInput.seed + Math.imul(runIndex + 1, 0x9E3779B1)) >>> 0)
  const allocationRandom = createRandom((safeInput.seed ^ Math.imul(runIndex + 11, 0x85EBCA6B)) >>> 0)
  const zones = createZones(safeInput)
  const timeline: DayState[] = []
  let totalAffected = Math.round(safeInput.initialInfected)
  let dosesUsed = 0
  const activeDays = strategy === 'none' ? 0 : Math.max(0, safeInput.days - safeInput.interventionDay)
  const dosesAvailable = activeDays * safeInput.vaccinesPerDay

  for (let day = 0; day <= safeInput.days; day += 1) {
    timeline.push(totals(zones, day))
    if (day === safeInput.days) break

    if (strategy !== 'none' && day >= safeInput.interventionDay) {
      const allocation = strategy === 'targeted'
        ? targetedAllocation(zones, safeInput.vaccinesPerDay)
        : randomAllocation(zones, safeInput.vaccinesPerDay, allocationRandom)
      allocation.forEach((amount, index) => {
        const protectedPeople = binomial(amount, safeInput.vaccineEfficacy, allocationRandom)
        zones[index].susceptible -= protectedPeople
        zones[index].vaccinated += protectedPeople
        dosesUsed += amount
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
      const newExposed = binomial(zone.susceptible, 1 - Math.exp(-force), diseaseRandom)
      const newInfectious = binomial(zone.exposed, safeInput.incubationRate, diseaseRandom)
      const newRecovered = binomial(zone.infected, safeInput.recoveryRate, diseaseRandom)
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
    p10Affected: quantile(affected, 0.1),
    p90Affected: quantile(affected, 0.9),
    meanPeak: mean(runs.map(run => run.peakInfected)),
    meanPeakDay: mean(runs.map(run => run.peakDay)),
    meanProtected: mean(runs.map(run => run.protectedPeople)),
    meanDosesUsed: mean(runs.map(run => run.dosesUsed)),
    dosesAvailable: runs[0]?.dosesAvailable ?? 0,
  }
}

export function compareStrategies(input: SimulationInput): ComparisonResult {
  const runCount = clamp(Math.round(input.runs), 10, 1000)
  const strategies: Record<StrategyId, RunResult[]> = { targeted: [], random: [], none: [] }
  for (let run = 0; run < runCount; run += 1) {
    strategies.targeted.push(simulateOnce(input, 'targeted', run))
    strategies.random.push(simulateOnce(input, 'random', run))
    strategies.none.push(simulateOnce(input, 'none', run))
  }
  const targeted = aggregate('targeted', '7DaysToSurvive', strategies.targeted)
  const random = aggregate('random', 'Intervención al azar', strategies.random)
  const none = aggregate('none', 'No intervenir', strategies.none)
  const savedVsNone = Math.max(0, none.meanAffected - targeted.meanAffected)
  const savedVsRandom = Math.max(0, random.meanAffected - targeted.meanAffected)
  return {
    targeted,
    random,
    none,
    savedVsNone,
    savedVsRandom,
    impactPercent: none.meanAffected ? savedVsNone / none.meanAffected * 100 : 0,
  }
}
