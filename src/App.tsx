import { useEffect, useRef, useState } from 'react'
import { ScenarioControls } from './components/ScenarioControls'
import { ExperimentResults } from './components/ExperimentResults'
import { createSimulationClient } from './features/simulation/client'
import { configToDraft, parseDraft, type Draft, type FieldErrors } from './features/simulation/scenario'
import { DEFAULT_CONFIG, type ExperimentConfig, type ExperimentProgress, type ExperimentResult } from './shared/simulation-contract'

export default function App() {
  const [draft, setDraft] = useState(() => configToDraft(DEFAULT_CONFIG))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Configura el escenario y ejecuta la primera simulación.')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<ExperimentProgress | null>(null)
  const [runningConfig, setRunningConfig] = useState<ExperimentConfig | null>(null)
  const [result, setResult] = useState<ExperimentResult | null>(null)
  const [revision, setRevision] = useState(0)
  const client = useRef<ReturnType<typeof createSimulationClient> | null>(null)
  useEffect(() => {
    document.title = '7DaysToSurvive | Sala de mando'
    const simulation = createSimulationClient(response => {
      if (response.type === 'progress') setProgress(response.progress)
      else {
        setRunning(false)
        setRunningConfig(null)
        if (response.type === 'result') {
          setResult(response.result)
          setRevision(value => value + 1)
          setStatus(`Simulación completada: semilla ${response.result.config.seed}, ${response.result.config.repetitions} repeticiones.`)
        } else {
          setError(response.message)
          setStatus('La ejecución no se completó. Revisa el error y vuelve a ejecutar.')
        }
      }
    })
    client.current = simulation
    return () => { simulation.cancel(); client.current = null }
  }, [])
  const change = (next: Draft) => {
    setDraft(next)
    setErrors({})
    setError('')
  }
  const run = () => {
    if (running) return
    const validation = parseDraft(draft)
    setErrors(validation.errors)
    setError('')
    if (!validation.config) {
      setStatus('Hay valores inválidos. Corrige los campos señalados.')
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setRunning(true)
    setProgress(null)
    setRunningConfig(validation.config)
    setStatus(`Ejecutando semilla ${validation.config.seed}; ${validation.config.repetitions} repeticiones.`)
    client.current?.run(validation.config)
  }
  const cancel = () => {
    client.current?.cancel()
    setRunning(false)
    setProgress(null)
    setRunningConfig(null)
    setStatus('Ejecución cancelada. Puedes volver a ejecutar; el resultado anterior se conserva.')
  }
  const reset = () => {
    change(configToDraft(DEFAULT_CONFIG))
    setNotice('Configuración restablecida a los valores iniciales. Pulsa Ejecutar para aplicarla.')
  }
  const dirty = result && Object.entries(result.config).some(([key, value]) => String(value) !== draft[key as keyof ExperimentConfig])
  const changedDuringRun = runningConfig && Object.entries(runningConfig).some(([key, value]) => String(value) !== draft[key as keyof ExperimentConfig])
  return <main>
    <a className="skip-link" href="#simulation-results">Saltar a resultados</a>
    <nav aria-label="Identidad del proyecto"><a className="brand" href="#"><span className="brand-mark" aria-hidden="true">7D</span><span>7DaysToSurvive<small>Sala de mando de contención</small></span></a><span className="status"><i aria-hidden="true" /> Simulación local y reproducible</span></nav>
    <header className="hero"><div><p className="eyebrow">SpookyThon 2026 / La Plaga Zombie</p><h1>Siete días para reaccionar.<br />Cada contacto cuenta.</h1><p className="lead">Una red sintética inspirada en Manta. Recursos limitados. Compara tres respuestas al brote y toma una decisión con evidencia.</p></div><div className="hero-card"><span>Tu misión</span><strong>Configurar. Comparar. Decidir.</strong><p>La historia empieza en siete días.<br />Tú eliges cuánto dura la simulación.</p></div></header>
    <div className="safety-strip"><span aria-hidden="true">◇</span><p>Escenario ficticio y educativo. Población sintética y parámetros sin calibración sanitaria.</p></div>
    <section className="workspace" aria-label="Simulador de contención">
      <ScenarioControls draft={draft} errors={errors} running={running} progress={progress} notice={notice} onChange={change} onRun={run} onCancel={cancel} onReset={reset} onNotice={setNotice} />
      <div className="results" id="simulation-results" tabIndex={-1}>
        <p className={`run-status ${running ? 'is-running' : ''}`} role="status">{status}</p>
        {error && <div className="error-banner" role="alert"><strong>No se pudo completar la simulación</strong><p>{error}</p><p>Corrige la configuración o vuelve a ejecutar.</p></div>}
        {dirty && <p className="pending-banner">Hay cambios sin ejecutar. Los resultados visibles corresponden a la configuración aplicada que figura debajo.</p>}
        {changedDuringRun && <p className="pending-banner">Cambiaste el escenario durante la ejecución. Se está calculando la semilla {runningConfig!.seed} con la configuración capturada al pulsar Ejecutar.</p>}
        {result ? <ExperimentResults result={result} revision={revision} /> : <section className="panel empty-state" aria-labelledby="ready-title"><div className="empty-radar" aria-hidden="true"><span>7D</span><i /><i /><i /></div><p className="eyebrow">Preparación del experimento</p><h2 id="ready-title">El próximo movimiento es tuyo.</h2><p>Ejecuta el escenario para comparar no intervenir, vacunar al azar y priorizar a quienes tienen más contactos.</p><ol><li>Configura el brote y los recursos.</li><li>Ejecuta las repeticiones con la misma red.</li><li>Compara promedios, rangos y contagios evitados.</li></ol><p className="muted">Todavía no hay resultados. El cálculo se realiza en tu dispositivo.</p></section>}
      </div>
    </section>
    <footer><span>7DaysToSurvive · Modelo SIR con vacunación · Red de contactos sintética</span><span>Cálculo en tu navegador</span></footer>
  </main>
}
