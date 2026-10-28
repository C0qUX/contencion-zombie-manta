export type SimulationInput = {
  population: number
  initialInfected: number
  days: number
  transmissionRate: number
  recoveryRate: number
  vaccinesPerDay: number
  interventionDay: number
  seed: number
}

export type DayState = {
  day: number
  susceptible: number
  infected: number
  recovered: number
  vaccinated: number
}

export type SimulationResult = {
  timeline: DayState[]
  peakInfected: number
  peakDay: number
  totalAffected: number
  protectedPeople: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function simulate(input: SimulationInput): SimulationResult {
  const population = Math.max(1, Math.round(input.population))
  let susceptible = Math.max(0, population - input.initialInfected)
  let infected = clamp(Math.round(input.initialInfected), 0, population)
  let recovered = 0
  let vaccinated = 0
  let totalAffected = infected
  const timeline: DayState[] = []

  for (let day = 0; day <= input.days; day += 1) {
    timeline.push({ day, susceptible, infected, recovered, vaccinated })
    if (day === input.days || infected === 0) continue

    const interventionActive = day >= input.interventionDay
    const vaccines = interventionActive
      ? Math.min(susceptible, Math.max(0, Math.round(input.vaccinesPerDay)))
      : 0
    susceptible -= vaccines
    vaccinated += vaccines

    const effectiveTransmission = input.transmissionRate * (interventionActive ? 0.82 : 1)
    const newInfections = Math.min(
      susceptible,
      Math.max(0, Math.round(effectiveTransmission * infected * (susceptible / population))),
    )
    const newRecoveries = Math.min(infected, Math.max(0, Math.round(input.recoveryRate * infected)))
    susceptible -= newInfections
    infected += newInfections - newRecoveries
    recovered += newRecoveries
    totalAffected += newInfections
  }

  const peak = timeline.reduce((best, current) => current.infected > best.infected ? current : best)
  return {
    timeline,
    peakInfected: peak.infected,
    peakDay: peak.day,
    totalAffected,
    protectedPeople: vaccinated,
  }
}

export function compareStrategies(input: SimulationInput) {
  const strategy = simulate(input)
  const noIntervention = simulate({ ...input, vaccinesPerDay: 0, interventionDay: input.days + 1 })
  const randomIntervention = simulate({
    ...input,
    interventionDay: Math.max(1, Math.round(input.days * 0.45)),
    vaccinesPerDay: Math.round(input.vaccinesPerDay * 0.65),
  })
  return { strategy, noIntervention, randomIntervention }
}
