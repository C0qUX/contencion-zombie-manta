import { useEffect, useState } from 'react'
import type { ExperimentConfig, ExperimentProgress } from '../shared/simulation-contract'
import { applySurprise, type Draft, type FieldErrors, type Surprise } from '../features/simulation/scenario'

type NumericKey = Exclude<keyof ExperimentConfig, 'initialZone'>
interface Props {
  draft: Draft
  errors: FieldErrors
  running: boolean
  progress: ExperimentProgress | null
  notice: string
  onChange: (draft: Draft) => void
  onRun: () => void
  onCancel: () => void
  onReset: () => void
  onNotice: (message: string) => void
}

export function ScenarioControls({ draft, errors, running, progress, notice, onChange, onRun, onCancel, onReset, onNotice }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  useEffect(() => {
    if (errors.recoveryProbability || errors.seed || errors.repetitions) setAdvancedOpen(true)
  }, [errors.recoveryProbability, errors.seed, errors.repetitions])
  const field = (key: NumericKey, label: string, min: number, max: number, step = 1, hint?: string) => <label className="field" key={key}>
    <span>{label}</span><input id={key} name={key} type="number" inputMode={step < 1 ? 'decimal' : 'numeric'} min={min} max={max} step={step}
      value={draft[key]} onChange={e => onChange({ ...draft, [key]: e.target.value })}
      aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined} />
    {hint && <small id={`${key}-hint`}>{hint}</small>}{errors[key] && <small className="field-error" id={`${key}-error`}>{errors[key]}</small>}
  </label>
  const surprise = (action: Surprise) => {
    const next = applySurprise(draft, action)
    onChange(next.draft)
    onNotice(next.message)
  }
  return <aside className="panel controls" aria-labelledby="scenario-title">
    <div className="section-title"><span>01</span><h2 id="scenario-title">Configurar escenario</h2></div>
    <p className="muted">Ajusta los recursos y las condiciones del brote.</p>
    <form onSubmit={e => { e.preventDefault(); onRun() }} noValidate>
      <div className="field-grid">
        {field('population', 'Población', 50, 1000)}
        {field('days', 'Días', 1, 60)}
        {field('initialInfected', 'Infectados iniciales', 1, Number(draft.population))}
        <label className="field"><span>Zona inicial</span><select name="initialZone" value={draft.initialZone} onChange={e => onChange({ ...draft, initialZone: e.target.value })} aria-invalid={!!errors.initialZone} aria-describedby={errors.initialZone ? 'zone-error' : undefined}>
          <option value="home">Hogares</option><option value="school">Colegio</option><option value="market">Mercado</option><option value="transport">Transporte</option><option value="random">Toda la población</option>
        </select>{errors.initialZone && <small id="zone-error" className="field-error">{errors.initialZone}</small>}</label>
      </div>
      {field('transmissionProbability', 'Contagio por contacto/día', 0, 1, 0.01, 'Probabilidad de 0 a 1; 0.08 equivale a 8 %.')}
      <div className="field-grid">
        {field('vaccinesPerDay', 'Dosis por día', 0, Number(draft.population))}
        {field('totalVaccines', 'Stock total', 0, Number(draft.population))}
        {field('interventionDay', 'Día de inicio', 1, Number(draft.days) + 1)}
        {field('vaccineEfficacy', 'Eficacia', 0, 1, 0.01)}
      </div>
      <details className="advanced" open={advancedOpen} onToggle={e => setAdvancedOpen(e.currentTarget.open)}><summary>Recuperación y reproducibilidad</summary>
        {field('recoveryProbability', 'Recuperación diaria', 0, 1, 0.01, 'Probabilidad diaria; no es una duración.')}
        {field('seed', 'Semilla', 0, 4294967295)}
        {field('repetitions', 'Repeticiones', 1, 200)}
      </details>
      {Object.keys(errors).length > 0 && <p className="field-error" role="alert">Corrige los campos señalados antes de ejecutar.</p>}
      <button className="primary-button" type="submit" disabled={running}>{running ? 'Simulando…' : 'Ejecutar simulación'}<span aria-hidden="true">▷</span></button>
      {running && <div className="execution-progress" role="status"><label htmlFor="experiment-progress">{progress ? `${progress.completed} de ${progress.total} repeticiones` : 'Preparando experimento…'}</label>
        <progress id="experiment-progress" max={progress?.total ?? 1} value={progress?.completed ?? 0} />
        <button type="button" onClick={onCancel}>Cancelar ejecución</button>
      </div>}
    </form>
    <section className="surprises" aria-labelledby="surprises-title"><h3 id="surprises-title"><span aria-hidden="true">⚡</span> Brote sorpresa</h3><p>Los cambios se acumulan. Pulsa Ejecutar para recalcular.</p>
      <div className="surprise-grid"><button onClick={() => surprise('contagion')}>Contagio ×2</button><button onClick={() => surprise('stock')}>Mitad de antídotos</button><button onClick={() => surprise('market')}>Paciente cero en el mercado</button><button onClick={() => surprise('variant')}>Variante: eficacia 50 %</button></div>
      <p className="change-notice" role="status">{notice}</p>
    </section>
    <button className="reset-button" onClick={onReset}>Restablecer valores iniciales</button>
  </aside>
}
