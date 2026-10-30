import { useEffect, useRef, useState } from 'react'
import { CurveChart } from './components/CurveChart'
import { PlaceNetwork } from './components/PlaceNetwork'
import { DEFAULT_INPUT, LOCATIONS, type ComparisonResult, type SimulationInput, type StrategySummary } from './domain/simulation'
import { createClient } from './features/client'
import { initialScenario, parseDraft, SCENARIOS, toDraft, type Draft } from './features/scenarios'

const number = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)
const fields: { key: Exclude<keyof SimulationInput, 'outbreakLocation'>; label: string; min: number; max: number; step?: number; help?: string }[] = [
  { key: 'population', label: 'Población sintética', min: 100, max: 50000 },
  { key: 'initialInfected', label: 'Infectados iniciales', min: 0, max: 50000 },
  { key: 'transmissionRate', label: 'Contagiosidad', min: 0, max: 1, step: .01, help: 'Intensidad de transmisión agregada; supuesto ficticio.' },
  { key: 'vaccinesPerDay', label: 'Dosis por día', min: 0, max: 50000 },
  { key: 'totalVaccines', label: 'Stock total', min: 0, max: 1000000 },
  { key: 'vaccineEfficacy', label: 'Eficacia (0 a 1)', min: 0, max: 1, step: .01 },
  { key: 'interventionDay', label: 'Día de intervención', min: 1, max: 181 },
  { key: 'seed', label: 'Semilla', min: 0, max: 4294967295, help: 'Mismo escenario y versión, mismo resultado.' },
  { key: 'runs', label: 'Corridas Monte Carlo', min: 1, max: 300 },
  { key: 'days', label: 'Horizonte en días', min: 1, max: 180 },
  { key: 'incubationRate', label: 'Progresión E → I por día', min: 0, max: 1, step: .01, help: 'Latencia hasta ser infeccioso; no es inicio de síntomas.' },
  { key: 'recoveryRate', label: 'Recuperación diaria', min: 0, max: 1, step: .01 },
]
const summaries = (result: ComparisonResult) => [result.targeted, result.random, result.none]
const signedClass = (value: number) => value < 0 ? 'negative' : 'good'

function StrategyRow({ strategy, result }: { strategy: StrategySummary; result: ComparisonResult }) {
  const avoided = result.none.meanAffected - strategy.meanAffected
  return <tr><th scope="row">{strategy.label}</th>
    <td>{number(strategy.meanAffected)}<small>P10–P90: {number(strategy.p10Affected)}–{number(strategy.p90Affected)}</small><small>Mín.–máx.: {number(strategy.minAffected)}–{number(strategy.maxAffected)}</small></td>
    <td>{number(strategy.meanPeak)}<small>Día medio {number(strategy.meanPeakDay)}</small></td>
    <td>{number(strategy.meanDosesUsed)}<small>Disponibles: {number(strategy.dosesAvailable)}</small></td>
    <td className={signedClass(avoided)}>{number(avoided)}<small>{number(result.none.meanAffected ? avoided / result.none.meanAffected * 100 : 0)} % frente a no actuar</small></td></tr>
}

export default function App() {
  const [start] = useState(() => initialScenario(window.location.search))
  const [draft, setDraft] = useState<Draft>(() => toDraft(start.input))
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [runningInput, setRunningInput] = useState<SimulationInput | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: start.input.runs })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(start.notice)
  const [presetId, setPresetId] = useState(start.notice ? 'personalizado' : 'oficial')
  const [elapsed, setElapsed] = useState(0)
  const began = useRef(0)
  const client = useRef<ReturnType<typeof createClient> | null>(null)
  const startRun = (input: SimulationInput) => {
    began.current = performance.now()
    setRunning(true); setRunningInput(input); setProgress({ completed: 0, total: input.runs }); setError('')
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
  const best = result ? summaries(result).reduce((a, b) => a.meanAffected <= b.meanAffected ? a : b) : null
  const plan = result?.targeted.meanFirstAllocation ?? []
  const priority = plan.length ? LOCATIONS[plan.indexOf(Math.max(...plan))].label : ''
  const hasAction = !!result && result.targeted.meanDosesUsed > 0
  return <main>
    <a className="skip-link" href="#resultados">Saltar a resultados</a>
    <nav aria-label="Identidad"><div className="brand"><span className="brand-mark" aria-hidden="true">7D</span><span>7DaysToSurvive</span></div><span className="status">Simulación local · AWS Amplify</span></nav>
    <header className="hero compact"><div><p className="eyebrow">COMITÉ DE CONTENCIÓN · TRACK B</p><h1>Decidir antes de que<br /><em>el brote decida.</em></h1><p className="lead">Recursos limitados. Múltiples futuros posibles. Compara una estrategia dirigida con el azar y con no intervenir.</p></div><div className="hero-card rigor-card"><span>Escenario ficticio</span><strong>Manta sintética</strong><small>Sin datos sanitarios reales ni calibración clínica.</small></div></header>
    <section className="workspace" aria-label="Simulador">
      <aside className="panel controls">
        <div className="section-title"><span>01</span><h2>Configurar y ejecutar</h2></div>
        <label className="select-field"><span>Escenarios de demostración</span><select value={presetId} onChange={event => {
          const preset = SCENARIOS.find(item => item.id === event.target.value)
          if (preset) { setPresetId(preset.id); setDraft(toDraft({ ...DEFAULT_INPUT, ...preset.changes })); setError(''); setNotice('Escenario cargado. Pulsa Ejecutar para aplicarlo.') }
        }}><option value="personalizado">Escenario personalizado</option>{SCENARIOS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <form onSubmit={event => { event.preventDefault(); run() }} noValidate>
          <label className="select-field"><span>Origen del brote</span><select name="outbreakLocation" value={draft.outbreakLocation} onChange={event => update('outbreakLocation', event.target.value)}>{LOCATIONS.map(location => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
          <div className="field-grid">{fields.map(field => <label className="number-field" key={field.key}><span>{field.label}</span><input name={field.key} aria-label={field.label} aria-describedby={field.help ? field.key + '-help' : undefined} aria-invalid={error.startsWith(field.key + ':') || undefined} type="number" min={field.min} max={field.max} step={field.step ?? 1} value={draft[field.key] ?? ''} onChange={event => update(field.key, event.target.value)} />{field.help && <small id={field.key + '-help'}>{field.help}</small>}</label>)}</div>
          <button className="primary-button" type="submit" disabled={running}>{running ? 'Calculando…' : 'Ejecutar simulación'}</button>
        </form>
        {running && <div className="execution-progress" role="status"><label htmlFor="run-progress">{progress.completed} de {progress.total} corridas completas</label><progress id="run-progress" value={progress.completed} max={progress.total} /><button onClick={cancel}>Cancelar ejecución</button></div>}
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
        {result && best ? <>
          <section className="applied-config" aria-label="Configuración aplicada">
            <h2>Resultado simulado · semilla {result.config.seed}</h2>
            <p>{result.config.runs} corridas · {result.config.days} días · {number(result.config.population)} personas sintéticas · {number(elapsed / 1000)} s de cálculo</p>
            <p>Origen: {LOCATIONS.find(item => item.id === result.config.outbreakLocation)?.label} · I inicial: {result.config.initialInfected} · contagiosidad: {result.config.transmissionRate} · eficacia: {number(result.config.vaccineEfficacy * 100)} % · inicio: día {result.config.interventionDay}</p>
            <p>Capacidad: {result.config.vaccinesPerDay} dosis/día · stock: {result.config.totalVaccines} · E→I: {result.config.incubationRate}/día · recuperación: {result.config.recoveryRate}/día</p>
            <div className="report-actions"><button onClick={exportJSON}>Exportar JSON</button><button onClick={() => window.print()}>Imprimir informe</button></div>
          </section>
          <section className="metrics" aria-label="Diferencias de contagios">
            {[{ label: 'Frente a no intervenir', stats: result.pairedVsNone }, { label: 'Frente al azar', stats: result.pairedVsRandom }].map(item => {
              const isNegative = item.stats.mean < 0
              return <article key={item.label}><span>{item.label} {isNegative ? '(más contagios)' : ''}</span><strong className={signedClass(item.stats.mean)}>{number(item.stats.mean)}</strong><small>{isNegative ? 'La dirigida tuvo más contagios en promedio' : 'Contagios evitados medios'} · P10–P90: {number(item.stats.p10)} a {number(item.stats.p90)}</small></article>
            })}
            <article><span>Protegidos por vacunación dirigida</span><strong>{number(result.targeted.meanProtected)}</strong><small>{number(result.targeted.meanDosesUsed)} dosis usadas en promedio. No equivale a vidas salvadas.</small></article>
          </section>
          <section className="panel decision"><div><p className="eyebrow">DECISIÓN PARA MANTA</p><h2>{!hasAction ? 'No hay vacunación efectiva dentro de este plan.' : best.id === 'targeted' && result.savedVsRandom > 0 ? 'La estrategia dirigida obtiene menos contagios en promedio.' : best.id === 'random' ? 'El reparto al azar obtiene menos contagios en este escenario.' : best.id === 'none' ? 'No intervenir obtiene la menor media en este experimento.' : 'Las estrategias empatan en promedio.'}</h2>
            {hasAction && <p>Plan dirigido evaluado: empezar el día <b>{result.config.interventionDay}</b>, hasta <b>{number(result.config.vaccinesPerDay)} dosis/día</b> y <b>{number(result.targeted.dosesAvailable)} disponibles</b>. Mayor asignación inicial: <b>{priority.toLowerCase()}</b>; el reparto se vuelve a calcular cada día según el riesgo.</p>}
            <p><b>Recursos equivalentes evaluados:</b> la estrategia dirigida y el reparto al azar compiten con idéntica capacidad máxima (<b>{number(result.config.vaccinesPerDay)} dosis/día</b>) y el mismo stock disponible (<b>{number(result.config.totalVaccines ?? 0)} dosis</b>), iniciando ambas en el día <b>{result.config.interventionDay}</b>.</p>
            <p>Dirigida frente al azar: <b>{number(result.savedVsRandom)} contagios evitados en promedio</b>, con diferencias pareadas P10–P90 de {number(result.pairedVsRandom.p10)} a {number(result.pairedVsRandom.p90)}. {result.pairedVsRandom.min < 0 ? 'Hubo corridas donde la dirigida perdió.' : 'El resultado no garantiza ganar en otros escenarios.'}</p>
            <p>La menor media es una comparación del escenario, no una garantía causal ni una búsqueda del óptimo global.</p>
          </div></section>
          <section className="panel chart-panel"><div className="section-title"><span>02</span><h2>Curva de infecciosos</h2></div><CurveChart targeted={result.targeted} random={result.random} none={result.none} interventionDay={result.config.interventionDay} /></section>
          <section className="panel comparison"><div className="section-title"><span>03</span><h2>Comparación con recursos equivalentes</h2></div><p className="table-intro">Dirigida y azar comparten stock, capacidad, inicio, eficacia y horizonte. Las dosis realmente usadas pueden diferir al agotarse sus susceptibles. Cada intento fallido consume una dosis.</p><div className="table-scroll" tabIndex={0} role="region" aria-label="Tabla de estrategias"><table><caption>Medias de {result.config.runs} corridas; diferencia firmada frente a no intervenir</caption><thead><tr><th scope="col">Estrategia</th><th scope="col">Contagios acumulados</th><th scope="col">Pico infeccioso</th><th scope="col">Dosis usadas</th><th scope="col">Contagios evitados</th></tr></thead><tbody>{summaries(result).map(strategy => <StrategyRow key={strategy.id} strategy={strategy} result={result} />)}</tbody></table></div></section>
          <PlaceNetwork result={result} />
          <section className="panel explanation"><h2>Cómo leer este resultado</h2><p><b>Resultado simulado:</b> cada media resume {result.config.runs} futuros. P10–P90 es el rango empírico entre corridas, no un intervalo de confianza de la media. Un valor negativo de contagios evitados significa más contagios con la dirigida.</p><p><b>SEIR:</b> S sano (susceptible), E mordido (expuesto, aún no infeccioso), I zombie (infeccioso) y R exorcizado (recuperado). V identifica protección por vacuna. Los cinco grupos son excluyentes. El tiempo sin síntomas no es necesariamente el tiempo no infeccioso.</p><p><b>Datos sintéticos:</b> población, lugares y conectividad. <b>Supuestos:</b> tasas, eficacia, stock y estado observable. <b>Datos reales de Manta:</b> no se utilizan. Inspiración narrativa: COVID-19 y transmisión respiratoria; no es una calibración de esa enfermedad.</p><details><summary>Método, supuestos y limitaciones</summary><ul>{result.warnings.map(warning => <li key={warning}>{warning}</li>)}<li>Modelo agregado en cinco lugares, sin personas ni aristas individuales. Vacuna de protección inmediata y observación perfecta de susceptibles.</li><li>Los fallos de vacuna permanecen susceptibles y pueden recibir otro intento en días posteriores.</li><li>Se usa aproximación normal de binomial en grupos grandes. Los parámetros no proceden de una estimación sanitaria local.</li><li>Azar por claves de corrida/día/lugar/evento, común entre estrategias; reparto aleatorio con flujo separado.</li></ul><p>Algoritmo {result.algorithmVersion}. <a href="https://www.who.int/news-room/fact-sheets/detail/coronavirus-disease-(COVID-19)" target="_blank" rel="noreferrer">Contexto público de la OMS</a>. La configuración y los resultados se incluyen en el JSON; la duración depende del dispositivo y no altera el resultado reproducible.</p></details></section>
        </> : <section className="panel empty-state"><h2>{running ? 'Evaluando futuros posibles…' : 'Prepara el escenario'}</h2><p>El cálculo se realiza en tu navegador. Puedes cambiar los controles mientras avanza o cancelarlo.</p></section>}
      </div>
    </section>
    <footer><span>7DaysToSurvive · simulación educativa, sin validación clínica.</span><span>AWS Amplify Hosting · us-east-2 · cálculo en tu dispositivo</span></footer>
  </main>
}
