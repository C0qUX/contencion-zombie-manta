import { useEffect, useRef, useState } from 'react'
import { DashboardSummary } from './components/DashboardSummary'
import { CurveChart } from './components/CurveChart'
import { PlaceNetwork } from './components/PlaceNetwork'
import { SeedValidation } from './components/SeedValidation'
import { DEFAULT_INPUT, LOCATIONS, type ComparisonResult, type ProgressPhase, type SimulationInput, type StrategySummary } from './domain/simulation'
import { createClient } from './features/client'
import { initialScenario, parseDraft, SCENARIOS, toDraft, type Draft } from './features/scenarios'

const number = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)
const usd = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
const fields: { key: Exclude<keyof SimulationInput, 'outbreakLocation'>; label: string; min: number; max: number; step?: number; help?: string }[] = [
  { key: 'population', label: 'Población sintética', min: 100, max: 50000 },
  { key: 'initialInfected', label: 'Infectados iniciales', min: 0, max: 50000 },
  { key: 'transmissionRate', label: 'Contagiosidad', min: 0, max: 1, step: .01, help: 'Intensidad de transmisión agregada; supuesto ficticio.' },
  { key: 'vaccinesPerDay', label: 'Dosis por día', min: 0, max: 50000 },
  { key: 'totalVaccines', label: 'Stock total', min: 0, max: 1000000 },
  { key: 'vaccineEfficacy', label: 'Eficacia de vacuna (0 a 1)', min: 0, max: 1, step: .01, help: '0,82 significa que funciona en el 82 % de los intentos.' },
  { key: 'interventionDay', label: 'Día de intervención', min: 1, max: 181 },
  { key: 'seed', label: 'Número de partida', min: 0, max: 4294967295, help: 'Si repites este número, se repite el resultado.' },
  { key: 'runs', label: 'Futuros que probamos', min: 1, max: 300, help: 'Repetimos la historia muchas veces para no depender de la suerte.' },
  { key: 'days', label: 'Horizonte en días', min: 1, max: 180 },
  { key: 'incubationRate', label: 'Progresión E → I por día', min: 0, max: 1, step: .01, help: 'Latencia hasta ser infeccioso; no es inicio de síntomas.' },
  { key: 'recoveryRate', label: 'Recuperación diaria', min: 0, max: 1, step: .01 },
  { key: 'costPerDose', label: 'Costo por dosis (USD)', min: 0, max: 100000, step: .01, help: 'Supuesto ficticio editable; no es un precio real.' },
]
const summaries = (result: ComparisonResult) => [result.targeted, result.random, result.none]
const signedClass = (value: number) => value < 0 ? 'negative' : 'good'

function StrategyRow({ strategy, result }: { strategy: StrategySummary; result: ComparisonResult }) {
  const avoided = result.none.meanAffected - strategy.meanAffected
  return <tr><th scope="row">{strategy.label}</th>
    <td>{number(strategy.meanAffected)}<small>Mediana: {number(strategy.medianAffected)}</small><small>P10–P90: {number(strategy.p10Affected)}–{number(strategy.p90Affected)}</small><small>Mín.–máx.: {number(strategy.minAffected)}–{number(strategy.maxAffected)}</small></td>
    <td>{number(strategy.meanPeak)}<small>Día medio {number(strategy.meanPeakDay)}</small></td>
    <td>{number(strategy.meanDosesUsed)}<small>Disponibles: {number(strategy.dosesAvailable)}</small><small>Costo: {usd(strategy.meanDosesUsed * (result.config.costPerDose ?? 0))}</small></td>
    <td className={signedClass(avoided)}>{number(avoided)}<small>{number(result.none.meanAffected ? avoided / result.none.meanAffected * 100 : 0)} % frente a no actuar</small></td></tr>
}

export default function App() {
  const [start] = useState(() => initialScenario(window.location.search))
  const [draft, setDraft] = useState<Draft>(() => toDraft(start.input))
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [runningInput, setRunningInput] = useState<SimulationInput | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ completed: number; total: number; phase?: ProgressPhase }>({ completed: 0, total: 1 })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(start.notice)
  const [presetId, setPresetId] = useState(start.notice ? 'personalizado' : 'oficial')
  const [elapsed, setElapsed] = useState(0)
  const began = useRef(0)
  const client = useRef<ReturnType<typeof createClient> | null>(null)
  const startRun = (input: SimulationInput) => {
    began.current = performance.now()
    setRunning(true); setRunningInput(input); setProgress({ completed: 0, total: 1 }); setError('')
    client.current?.run(input)
  }
  useEffect(() => {
    client.current = createClient(message => {
      if (message.type === 'progress') setProgress(message)
      else {
        setRunning(false); setRunningInput(null)
        if (message.type === 'result') { setResult(message.result); setElapsed(performance.now() - began.current) }
        else setError(message.message)
      }
    })
    startRun(start.input)
    return () => { client.current?.cancel(); client.current = null }
  }, [start])
  const run = () => {
    if (running) return
    try { startRun(parseDraft(draft)) } catch (failure) { setError(failure instanceof Error ? failure.message : 'Revisa los campos.') }
  }
  const cancel = () => {
    client.current?.cancel(); setRunning(false); setRunningInput(null)
    setNotice('Ejecución cancelada. Se conserva el último resultado completo.')
  }
  const update = (key: keyof SimulationInput, value: string) => { setDraft(current => ({ ...current, [key]: value })); setError(''); setPresetId('personalizado') }
  const errorField = fields.find(field => error.startsWith(field.key + ':'))
  const readableError = errorField ? error.replace(errorField.key + ':', errorField.label + ':') : error
  const pending = result && Object.entries(result.config).some(([key, value]) => draft[key as keyof SimulationInput] !== String(value))
  const changedDuringRun = runningInput && Object.entries(runningInput).some(([key, value]) => draft[key as keyof SimulationInput] !== String(value))
  const exportJSON = () => {
    if (!result) return
    const url = URL.createObjectURL(new Blob([JSON.stringify({ product: '7DaysToSurvive', ...result }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = '7DaysToSurvive-' + result.config.seed + '.json'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const share = async () => {
    try {
      const input = parseDraft(draft)
      const url = new URL(window.location.href)
      url.search = ''; url.hash = ''; url.searchParams.set('escenario', JSON.stringify(input))
      await navigator.clipboard.writeText(url.href)
      setNotice('Enlace copiado con la configuración editable. Los resultados se calculan al abrirlo.')
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo copiar el enlace.') }
  }
  const advanced = new Set(['population', 'days', 'incubationRate', 'recoveryRate', 'costPerDose'])
  const renderField = (field: typeof fields[number]) => <label className="number-field" key={field.key}><span>{field.label}</span><input name={field.key} aria-label={field.key === 'seed' ? 'Semilla' : field.label} aria-describedby={field.help ? field.key + '-help' : undefined} aria-invalid={error.startsWith(field.key + ':') || undefined} type="number" min={field.min} max={field.max} step={field.step ?? 1} value={draft[field.key] ?? ''} onChange={event => update(field.key, event.target.value)} />{field.help && <small id={field.key + '-help'}>{field.help}</small>}</label>
  return <main>
    <a className="skip-link" href="#resultados">Saltar a resultados</a>
    <nav aria-label="Identidad" className="app-topbar"><a className="brand" href="#resumen"><span className="brand-mark" aria-hidden="true">7D</span><span>7DaysToSurvive<small>Planificación de contención</small></span></a><span className="environment-badge"><i />Escenario educativo</span></nav>
    <header className="dashboard-header"><div><p className="eyebrow">7DAYS TO SURVIVE · MANTA</p><h1>¿Cómo protegemos<br className="mobile-break" /> a Manta?</h1><p>La ciudad tiene pocas vacunas. Mira cómo avanza el brote y descubre dónde conviene actuar primero.</p></div><a className="configure-link" href="#configuracion">Cambiar el brote ↗</a></header>
    <nav className="dashboard-navigation" aria-label="Secciones del dashboard"><a href="#resumen">La decisión</a><a href="#mapa-manta">Ver el brote</a><a href="#comparacion">Comparar planes</a><a href="#metodo">Cómo funciona</a></nav>
    <p className="context-note">Una ciudad simulada para aprender a decidir · Calles reales, habitantes y casos inventados</p>
    <section className="workspace" aria-label="Simulador">
      <aside className="panel controls" id="configuracion">
        <div className="section-title"><span>01</span><h2>Cambia la historia</h2></div>
        <label className="select-field"><span>Escenarios de demostración</span><select value={presetId} onChange={event => {
          const preset = SCENARIOS.find(item => item.id === event.target.value)
          if (preset) { setPresetId(preset.id); setDraft(toDraft({ ...DEFAULT_INPUT, ...preset.changes })); setError(''); setNotice('Escenario cargado. Pulsa Ejecutar para aplicarlo.') }
        }}><option value="personalizado">Escenario personalizado</option>{SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <form onSubmit={event => { event.preventDefault(); run() }} noValidate>
          <label className="select-field"><span>Origen del brote</span><select name="outbreakLocation" value={draft.outbreakLocation} onChange={event => update('outbreakLocation', event.target.value)}>{LOCATIONS.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
          <div className="field-grid">{fields.filter(field => !advanced.has(field.key)).map(renderField)}</div>
          <details className="advanced-controls" open={errorField && advanced.has(errorField.key) ? true : undefined}><summary>Más parámetros del escenario</summary><p>Población, duración, costos y supuestos del modelo.</p><div className="field-grid">{fields.filter(field => advanced.has(field.key)).map(renderField)}</div></details>
          <button className="primary-button" type="submit" disabled={running}>{running ? 'Calculando…' : 'Ejecutar simulación'}</button>
        </form>
        {running && <div className="execution-progress" role="status"><label htmlFor="run-progress">{progress.phase === 'calibracion' ? 'Buscando la mejor regla' : 'Comparando estrategias'} · {Math.floor(progress.completed / Math.max(1, progress.total) * 100)} %</label><progress id="run-progress" value={progress.completed} max={progress.total} /><button onClick={cancel}>Cancelar ejecución</button></div>}
        <div className="surprises"><h3>Brote sorpresa <small style={{ display: 'block', fontWeight: 'normal', color: '#c3d5e2', fontSize: '11px', marginTop: '2px' }}>Ajuste de parámetros en vivo</small></h3><div className="surprise-actions"><button type="button" title="Duplica la tasa de contagiosidad" onClick={() => {
          const value = Number(draft.transmissionRate)
          if (!draft.transmissionRate.trim() || !Number.isFinite(value) || value < 0 || value > 1) { setError('transmissionRate: corrige la contagiosidad.'); return }
          const next = Math.min(1, value * 2); update('transmissionRate', String(next)); setNotice('Contagiosidad: ' + value + ' → ' + next + '. Ejecuta para aplicar.')
        }}>⚡ Contagio ×2 (duplica transmisión)</button><button type="button" title="Reduce el stock total de vacunas a la mitad" onClick={() => {
          const value = Number(draft.totalVaccines)
          if (!draft.totalVaccines?.trim() || !Number.isSafeInteger(value) || value < 0) { setError('totalVaccines: corrige el stock.'); return }
          update('totalVaccines', String(Math.floor(value / 2))); setNotice('Stock: ' + value + ' → ' + Math.floor(value / 2) + '. Ejecuta para aplicar.')
        }}>📉 Mitad del stock (-50% vacunas)</button></div></div>
        <button onClick={() => { setDraft(toDraft(DEFAULT_INPUT)); setPresetId('oficial'); setError(''); setNotice('Escenario oficial restablecido. Ejecuta para aplicar.') }}>Restablecer escenario oficial</button>
        <button onClick={share}>Copiar enlace del escenario</button>
        {notice && <p className="notice" role="status">{notice}</p>}
      </aside>
      <div className="results" id="resultados" tabIndex={-1} aria-busy={running}>
        {error && <p className="error-banner" role="alert">{readableError}</p>}
        {changedDuringRun && <p className="pending-banner">Editaste los controles durante el cálculo. Esta ejecución usa la configuración capturada al pulsar Ejecutar.</p>}
        {pending && <p className="pending-banner">Hay cambios sin ejecutar. Los resultados conservan los parámetros aplicados que aparecen debajo.</p>}
        {result ? <>
          <DashboardSummary result={result} elapsed={elapsed} onExport={exportJSON} />
          <PlaceNetwork result={result} />
          <section className="panel chart-panel"><div className="section-title"><span>02</span><h2>¿Cuál plan frena mejor el brote?</h2></div><p className="table-intro">Cada línea muestra lo que pasa con un plan distinto. Cuanto más baja la línea, menos personas infectadas hay ese día.</p><CurveChart targeted={result.targeted} random={result.random} none={result.none} interventionDay={result.config.interventionDay} /></section>
          <section className="panel comparison" id="comparacion"><div className="section-title"><span>03</span><h2>Los tres planes, lado a lado</h2></div><p className="table-intro">El plan dirigido y el azar reciben las mismas vacunas, empiezan el mismo día y tienen la misma eficacia. Pueden terminar usando cantidades distintas si ya no quedan personas sanas elegibles.</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Tabla de estrategias"><table><caption>Promedios de {result.config.runs} futuros simulados; las cifras pueden variar.</caption><thead><tr><th scope="col">Plan</th><th scope="col">Personas contagiadas</th><th scope="col">Mayor número de infectados a la vez</th><th scope="col">Dosis usadas</th><th scope="col">Contagios evitados</th></tr></thead><tbody>{summaries(result).map(strategy => <StrategyRow key={strategy.id} strategy={strategy} result={result} />)}</tbody></table></div></section>
          <SeedValidation result={result} />
          <section className="panel explanation" id="metodo"><h2>Cómo leer este resultado</h2><p className="method-intro">La simulación ayuda a comparar decisiones en un escenario ficticio de Manta.</p><details className="reading-guide"><summary>Entender las cifras, los estados y la incertidumbre</summary><p><b>Resultado simulado:</b> cada media resume {result.config.runs} futuros. P10–P90 es el rango empírico entre corridas, no un intervalo de confianza de la media. Un valor negativo de contagios evitados significa más contagios con la dirigida.</p><p><b>SEIR:</b> S sano (susceptible), E mordido (expuesto, aún no infeccioso), I zombie (infeccioso) y R exorcizado (recuperado). V identifica protección por vacuna. Los cinco grupos son excluyentes. El tiempo sin síntomas no es necesariamente el tiempo no infeccioso.</p><p><b>Datos sintéticos:</b> población, lugares y conectividad. <b>Supuestos:</b> tasas, eficacia, stock y estado observable. <b>Geografía:</b> las calles del mapa son reales; los casos y grupos de contacto son sintéticos. Inspiración narrativa: COVID-19 y transmisión respiratoria; no es una calibración de esa enfermedad.</p></details><details><summary>Método, supuestos y limitaciones</summary><ul>{result.warnings.map(warning => <li key={warning}>{warning}</li>)}<li>Modelo agregado en cinco lugares, sin personas ni aristas individuales. Vacuna de protección inmediata y observación perfecta de susceptibles.</li><li>Los fallos de vacuna permanecen susceptibles y pueden recibir otro intento en días posteriores.</li><li>Se usa aproximación normal de binomial en grupos grandes. Los parámetros no proceden de una estimación sanitaria local.</li><li>Azar por claves de corrida/día/lugar/evento, común entre estrategias; reparto aleatorio con flujo separado.</li></ul><p>Algoritmo {result.algorithmVersion}. <a href="https://www.who.int/news-room/fact-sheets/detail/coronavirus-disease-(COVID-19)" target="_blank" rel="noreferrer">Contexto público de la OMS</a>. La configuración y los resultados se incluyen en el JSON; la duración depende del dispositivo y no altera el resultado reproducible.</p></details></section>
        </> : <section className="panel empty-state"><h2>{running ? 'Evaluando futuros posibles…' : 'Prepara el escenario'}</h2><p>El cálculo se realiza en tu navegador. Puedes cambiar los controles mientras avanza o cancelarlo.</p></section>}
      </div>
    </section>
    <footer><span>7DaysToSurvive · simulación educativa, sin validación clínica.</span><span>AWS Amplify Hosting · us-east-2 · cálculo en tu dispositivo</span></footer>
  </main>
}
