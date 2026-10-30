import { useMemo, useState } from 'react'
import { CurveChart } from './components/CurveChart'
import { LOCATIONS, compareStrategies, type LocationId, type SimulationInput, type StrategySummary } from './domain/simulation'

const initial: SimulationInput = {
  population: 15000,
  initialInfected: 35,
  days: 90,
  transmissionRate: 0.34,
  recoveryRate: 0.16,
  incubationRate: 0.22,
  vaccinesPerDay: 180,
  interventionDay: 6,
  vaccineEfficacy: 0.82,
  seed: 2026,
  runs: 120,
  outbreakLocation: 'mercado',
}

const integer = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(value)
const percent = (value: number) => `${Math.round(value * 100)} %`

function Field({ label, value, min, max, step = 1, display, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; display?: string; onChange: (n: number) => void
}) {
  return <label className="field"><span>{label}<b>{display ?? value}</b></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></label>
}

function StrategyRow({ strategy, winner = false }: { strategy: StrategySummary; winner?: boolean }) {
  return <tr className={winner ? 'winner' : ''}>
    <th>{strategy.label}{winner && <small>RECOMENDADA</small>}</th>
    <td>{integer(strategy.meanAffected)}</td>
    <td>{integer(strategy.p10Affected)}–{integer(strategy.p90Affected)}</td>
    <td>{integer(strategy.meanPeak)}</td>
    <td>{integer(strategy.meanDosesUsed)}</td>
  </tr>
}

export default function App() {
  const [input, setInput] = useState(initial)
  const results = useMemo(() => compareStrategies(input), [input])
  const update = <K extends keyof SimulationInput>(key: K, value: SimulationInput[K]) =>
    setInput(current => ({ ...current, [key]: value }))
  const origin = LOCATIONS.find(location => location.id === input.outbreakLocation)?.label ?? input.outbreakLocation

  return <main>
    <nav>
      <div className="brand"><span className="brand-mark">7D</span><span>7DaysToSurvive</span></div>
      <span className="status"><i /> {input.runs} simulaciones reproducibles</span>
    </nav>

    <header className="hero compact">
      <div>
        <p className="eyebrow">COMITÉ DE CONTENCIÓN · TRACK B</p>
        <h1>Decidir antes de que<br/><em>el brote decida.</em></h1>
        <p className="lead">Comparamos una asignación dirigida contra no intervenir y repartir los mismos recursos al azar. Cada resultado resume múltiples futuros posibles.</p>
      </div>
      <div className="hero-card rigor-card">
        <span>Prueba reproducible</span><strong>#{input.seed}</strong>
        <small>{input.runs} corridas · P10–P90 · origen: {origin}</small>
      </div>
    </header>

    <section className="workspace">
      <aside className="panel controls">
        <div className="section-title"><span>01</span><h2>Brote sorpresa</h2></div>
        <label className="select-field"><span>Origen del brote</span><select value={input.outbreakLocation} onChange={event => update('outbreakLocation', event.target.value as LocationId)}>{LOCATIONS.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
        <label className="number-field"><span>Semilla del jurado</span><input aria-label="Semilla del jurado" type="number" min="0" max="4294967295" value={input.seed} onChange={event => update('seed', Number(event.target.value) || 0)} /></label>
        <Field label="Población" value={input.population} min={5000} max={50000} step={1000} display={integer(input.population)} onChange={value => update('population', value)} />
        <Field label="Infectados iniciales" value={input.initialInfected} min={5} max={250} step={5} onChange={value => update('initialInfected', value)} />
        <Field label="Contagiosidad" value={input.transmissionRate} min={0.12} max={0.75} step={0.01} onChange={value => update('transmissionRate', value)} />
        <Field label="Vacunas por día" value={input.vaccinesPerDay} min={0} max={700} step={10} onChange={value => update('vaccinesPerDay', value)} />
        <Field label="Eficacia de vacuna" value={input.vaccineEfficacy} min={0.3} max={1} step={0.01} display={percent(input.vaccineEfficacy)} onChange={value => update('vaccineEfficacy', value)} />
        <Field label="Inicio de intervención" value={input.interventionDay} min={1} max={30} display={`Día ${input.interventionDay}`} onChange={value => update('interventionDay', value)} />
        <Field label="Corridas Monte Carlo" value={input.runs} min={20} max={300} step={20} onChange={value => update('runs', value)} />
        <button onClick={() => setInput(initial)}>Restablecer escenario</button>
      </aside>

      <div className="results">
        <section className="metrics">
          <article><span>Contagios evitados</span><strong className="good">{integer(results.savedVsNone)}</strong><small>promedio frente a no intervenir</small></article>
          <article><span>Ventaja contra azar</span><strong>{integer(results.savedVsRandom)}</strong><small>con el mismo presupuesto</small></article>
          <article><span>Personas protegidas</span><strong>{integer(results.targeted.meanProtected)}</strong><small>promedio de vacunación efectiva</small></article>
        </section>

        <section className="panel decision">
          <div><p className="eyebrow">DECISIÓN PARA EL ALCALDE</p><h2>Priorizar {origin.toLowerCase()} y los puntos con más casos conectados desde el día {input.interventionDay}.</h2><p>Asignar hasta <b>{integer(input.vaccinesPerDay)} vacunas diarias</b>. La estrategia reduce en promedio <b>{integer(results.savedVsNone)} contagios</b> frente a no actuar, con eficacia de {percent(input.vaccineEfficacy)}.</p></div>
          <div className="badge">Impacto esperado<br/><strong>{Math.round(results.impactPercent)} %</strong><small>{input.runs} futuros evaluados</small></div>
        </section>

        <section className="panel chart-panel"><div className="section-title"><span>02</span><h2>Curva del brote</h2></div><CurveChart targeted={results.targeted} random={results.random} none={results.none} /></section>

        <section className="panel comparison">
          <div className="section-title"><span>03</span><h2>Prueba justa</h2></div>
          <p className="table-intro">La estrategia y el azar reciben {integer(results.targeted.dosesAvailable)} dosis disponibles en el mismo calendario.</p>
          <div className="table-scroll"><table><thead><tr><th>Estrategia</th><th>Contagios medios</th><th>Rango P10–P90</th><th>Pico medio</th><th>Dosis usadas</th></tr></thead><tbody><StrategyRow strategy={results.targeted} winner /><StrategyRow strategy={results.random} /><StrategyRow strategy={results.none} /></tbody></table></div>
        </section>

        <section className="method-strip"><span><b>Modelo</b> SEIR estocástico</span><span><b>Red sintética</b> hogares · colegio · mercado · bus · barrio</span><span><b>Semilla</b> {input.seed}</span><span><b>Rango</b> percentiles 10–90</span></section>
      </div>
    </section>
    <footer><span>Herramienta educativa; no sustituye una recomendación sanitaria.</span><span>AWS Amplify Hosting · us-east-2</span></footer>
  </main>
}
