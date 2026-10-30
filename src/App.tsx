import { useMemo, useState } from 'react'
import { CurveChart } from './components/CurveChart'
import { compareStrategies, type SimulationInput } from './domain/simulation'

const initial: SimulationInput = {
  population: 15000,
  initialInfected: 35,
  days: 90,
  transmissionRate: 0.34,
  recoveryRate: 0.16,
  vaccinesPerDay: 180,
  interventionDay: 6,
  seed: 2028,
}

const number = (value: number) => new Intl.NumberFormat('es-EC').format(value)

function Field({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (n: number) => void
}) {
  return <label className="field"><span>{label}<b>{value}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /></label>
}

export default function App() {
  const [input, setInput] = useState(initial)
  const results = useMemo(() => compareStrategies(input), [input])
  const saved = Math.max(0, results.noIntervention.totalAffected - results.strategy.totalAffected)
  const randomSaved = Math.max(0, results.randomIntervention.totalAffected - results.strategy.totalAffected)
  const update = (key: keyof SimulationInput, value: number) => setInput(current => ({ ...current, [key]: value }))

  return <main>
    <nav><div className="brand"><span className="brand-mark">M0</span><span>MantaZero</span></div><span className="status"><i /> Simulación reproducible</span></nav>
    <header className="hero">
      <div><p className="eyebrow">COMITÉ DE CONTENCIÓN · TRACK B</p><h1>Decidir antes de que<br/><em>el brote decida.</em></h1><p className="lead">Comparamos estrategias de vacunación con recursos limitados para reducir contagios y comunicar una respuesta clara.</p></div>
      <div className="hero-card"><span>Semilla</span><strong>{input.seed}</strong><small>Misma configuración, mismo resultado</small></div>
    </header>

    <section className="workspace">
      <aside className="panel controls"><div className="section-title"><span>01</span><h2>Escenario</h2></div>
        <Field label="Población" value={input.population} min={5000} max={50000} step={1000} onChange={n => update('population', n)} />
        <Field label="Infectados iniciales" value={input.initialInfected} min={5} max={250} step={5} onChange={n => update('initialInfected', n)} />
        <Field label="Tasa de contagio" value={input.transmissionRate} min={0.12} max={0.6} step={0.01} onChange={n => update('transmissionRate', n)} />
        <Field label="Vacunas por día" value={input.vaccinesPerDay} min={0} max={700} step={10} onChange={n => update('vaccinesPerDay', n)} />
        <Field label="Inicio de intervención" value={input.interventionDay} min={1} max={30} onChange={n => update('interventionDay', n)} />
        <button onClick={() => setInput(initial)}>Restablecer escenario</button>
      </aside>

      <div className="results">
        <section className="metrics">
          <article><span>Pico con estrategia</span><strong>{number(results.strategy.peakInfected)}</strong><small>día {results.strategy.peakDay}</small></article>
          <article><span>Contagios evitados</span><strong className="good">{number(saved)}</strong><small>frente a no intervenir</small></article>
          <article><span>Personas protegidas</span><strong>{number(results.strategy.protectedPeople)}</strong><small>vacunación acumulada</small></article>
        </section>
        <section className="panel chart-panel"><div className="section-title"><span>02</span><h2>Curva del brote</h2></div><CurveChart strategy={results.strategy.timeline} baseline={results.noIntervention.timeline} /></section>
        <section className="panel recommendation"><div><p className="eyebrow">RECOMENDACIÓN</p><h2>Intervenir desde el día {input.interventionDay}</h2><p>La estrategia configurada evita <b>{number(saved)}</b> contagios frente a no actuar y mejora en <b>{number(randomSaved)}</b> casos la intervención tardía de referencia.</p></div><div className="badge">Impacto<br/><strong>{results.noIntervention.totalAffected ? Math.round(saved / results.noIntervention.totalAffected * 100) : 0}%</strong></div></section>
      </div>
    </section>
    <footer><span>Modelo SIR determinista · horizonte de {input.days} días</span><span>AWS Amplify Hosting · us-east-2</span></footer>
  </main>
}
