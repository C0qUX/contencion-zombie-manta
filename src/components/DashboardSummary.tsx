import { describePolicy, LOCATIONS, REFERENCE_POLICY, samePolicy, type ComparisonResult } from '../domain/simulation'

const n = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)
const usd = (value: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
export function DashboardSummary({ result, elapsed, onExport }: { result: ComparisonResult; elapsed: number; onExport: () => void }) {
  const { config, targeted, random, none } = result
  const best = [targeted, random, none].reduce((a, b) => a.meanAffected <= b.meanAffected ? a : b)
  const hasAction = targeted.meanProtected > 0
  const priority = LOCATIONS[targeted.meanFirstAllocation.indexOf(Math.max(...targeted.meanFirstAllocation))].label
  const recommends = hasAction && best.id === 'targeted' && result.savedVsRandom > 0
  const cost = targeted.meanDosesUsed * (config.costPerDose ?? 0)
  return <>
    <section className="applied-config result-toolbar" aria-label="Configuración aplicada" id="resumen">
      <div><p className="eyebrow">RESULTADO DEL ESCENARIO</p><h2>Resultado simulado · semilla {config.seed}</h2><p>{config.runs} corridas · {config.days} días · {n(config.population)} personas sintéticas · {n(elapsed / 1000)} s de cálculo</p></div>
      <div className="report-actions"><button onClick={onExport}>Exportar JSON</button><button onClick={() => window.print()}>Imprimir informe</button></div>
      <details className="scenario-receipt"><summary>Ver parámetros de este resultado</summary><p>Origen: {LOCATIONS.find(item => item.id === config.outbreakLocation)?.label} · I inicial: {config.initialInfected} · contagiosidad: {config.transmissionRate} · eficacia: {n(config.vaccineEfficacy * 100)} % · inicio: día {config.interventionDay}</p><p>Capacidad: {config.vaccinesPerDay} dosis/día · stock: {config.totalVaccines} · E→I: {config.incubationRate}/día · recuperación: {config.recoveryRate}/día · costo por dosis: {usd(config.costPerDose ?? 0)} (supuesto)</p></details>
    </section>
    <section className="panel decision">
      <div className="decision-heading"><span className="decision-icon" aria-hidden="true">↗</span><div><p className="eyebrow">DECISIÓN PARA MANTA</p><h2>{!hasAction ? 'No hay vacunación efectiva dentro de este plan.' : recommends ? 'La estrategia dirigida reduce más contagios en promedio.' : best.id === 'random' ? 'El reparto al azar obtiene menos contagios en este escenario.' : best.id === 'none' ? 'No intervenir obtiene la menor media en este experimento.' : 'Las estrategias empatan en promedio.'}</h2></div></div>
      {hasAction && <><p className="decision-subtitle">{recommends ? 'Plan recomendado dentro de este escenario simulado.' : 'Plan dirigido evaluado; compara la alternativa que obtuvo la menor media.'} La prioridad se ajusta cada día según el riesgo.</p><div className="decision-steps"><div><span>01 · Dónde empezar</span><strong>{priority}</strong><small>Mayor asignación inicial</small></div><div><span>02 · Cuándo actuar</span><strong>Día {config.interventionDay}</strong><small>Desde el inicio de la intervención</small></div><div><span>03 · Cuántos recursos</span><strong>{n(config.vaccinesPerDay)} dosis/día</strong><small>Stock de {n(config.totalVaccines ?? 0)} dosis</small></div></div></>}
      <p className="fairness-note">Comparación justa: dirigida y azar reciben el mismo stock, capacidad, fecha y eficacia. El consumo real puede diferir; se muestra en la tabla.</p>
      <details className="decision-method"><summary>Por qué se recomienda · costos y método</summary>
        {hasAction && <p>Costo estimado del plan dirigido: <b>{usd(cost)}</b>, con {n(targeted.meanDosesUsed)} dosis usadas × {usd(config.costPerDose ?? 0)}. {result.savedVsNone > 0 ? usd(cost / result.savedVsNone) + ' por contagio evitado frente a no actuar.' : 'No se estima costo por contagio evitado porque no hay mejora.'} Costo del azar: {usd(random.meanDosesUsed * (config.costPerDose ?? 0))}. El precio por dosis es un supuesto ficticio; estos montos no son costos de AWS.</p>}
        <p>{result.policySearch.calibrationRuns ? <>La regla dirigida se elige entre {result.policySearch.candidates.length} reglas en {result.policySearch.calibrationRuns} futuros de calibración, separados de las {config.runs} corridas de evaluación. Es una búsqueda acotada, no un óptimo global.</> : 'Se conserva la regla de referencia; no se realiza búsqueda cuando el plan no puede aportar protección vacunal.'} Regla: {describePolicy(result.policySearch.chosen)}.</p>
        <p>Frente a la regla fija original: {n(result.pairedVsReference.mean)} contagios evitados medios, P10–P90 de {n(result.pairedVsReference.p10)} a {n(result.pairedVsReference.p90)}. {result.pairedVsRandom.min < 0 ? 'Hubo corridas donde la dirigida perdió frente al azar.' : 'Este resultado no garantiza ganar en otros escenarios.'}</p>
        {result.policySearch.candidates.length > 0 && <details className="policy-search"><summary>Ver las {result.policySearch.candidates.length} reglas evaluadas en calibración</summary><div className="table-scroll"><table><caption>Media de contagios en {result.policySearch.calibrationRuns} futuros de calibración; gana la menor</caption><thead><tr><th>Regla</th><th>Contagios</th></tr></thead><tbody>{[...result.policySearch.candidates].sort((a, b) => a.meanAffected - b.meanAffected).map(candidate => <tr key={describePolicy(candidate.policy)} className={samePolicy(candidate.policy, result.policySearch.chosen) ? 'winner' : undefined}><th scope="row">{describePolicy(candidate.policy)}{samePolicy(candidate.policy, result.policySearch.chosen) && <small>ELEGIDA</small>}{samePolicy(candidate.policy, REFERENCE_POLICY) && <small>REGLA FIJA ORIGINAL</small>}</th><td>{n(candidate.meanAffected)}</td></tr>)}</tbody></table></div></details>}
      </details>
    </section>
    <section className="metrics" aria-label="Diferencias de contagios">
      {[{ label: 'Frente a no hacer nada', stats: result.pairedVsNone }, { label: 'Frente a vacunar al azar', stats: result.pairedVsRandom }].map(item => <article key={item.label}><span>{item.label}</span><strong className={item.stats.mean < 0 ? 'negative' : 'good'}>{n(item.stats.mean)}</strong><small>{item.stats.mean < 0 ? 'Más personas contagiadas' : 'Personas que evitarían el contagio, en promedio'}</small><small>En distintas partidas: de {n(item.stats.p10)} a {n(item.stats.p90)}</small></article>)}
      <article><span>Protegidas con vacuna</span><strong>{n(targeted.meanProtected)}</strong><small>{n(targeted.meanDosesUsed)} dosis usadas en promedio</small><small>Son cifras simuladas, no personas reales.</small></article>
    </section>
  </>
}
