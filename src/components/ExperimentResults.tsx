import type { ExperimentResult, Statistics } from '../shared/simulation-contract'
import { formatNumber as n, recommendation, STRATEGIES, STRATEGY_NAMES } from '../features/simulation/scenario'
import { CurveChart } from './CurveChart'
import { ContactNetwork } from './ContactNetwork'

function Statistic({ stats }: { stats: Statistics }) {
  return <><strong>{n(stats.mean)}</strong><small>mín. {n(stats.min)} · máx. {n(stats.max)}</small></>
}

export function ExperimentResults({ result, revision }: { result: ExperimentResult; revision: number }) {
  const comparisons = [
    { label: 'Frente a no intervenir', stats: result.avoidedVsNone },
    { label: 'Frente a vacunar al azar', stats: result.avoidedVsRandom },
  ]
  const exportResult = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ config: result.config, result }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `7DaysToSurvive-semilla-${result.config.seed}.json`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <div className="applied-config"><span>Resultado aplicado: <b>semilla {result.config.seed}</b> · {result.config.population} personas · {result.config.days} días · {result.config.repetitions} repeticiones</span><button onClick={exportResult}>Exportar JSON</button></div>
    <section className="metrics" aria-label="Contagios evitados por la estrategia por contactos">{comparisons.map(({ label, stats }) => <article key={label}>
      <span>{label}</span><strong className={stats.mean < 0 ? 'negative' : 'good'}>{n(stats.mean)}</strong><p>Contagios evitados en promedio</p><small>P10–P90: {n(stats.p10)} a {n(stats.p90)}</small><small>Mín. {n(stats.min)} · máx. {n(stats.max)}</small>
    </article>)}</section>
    <section className="panel chart-panel" aria-labelledby="chart-heading"><div className="section-heading"><div><div className="section-title"><span>02</span><h2 id="chart-heading">Comparar el brote</h2></div><p>Infectados activos, con variabilidad entre repeticiones.</p></div><span className="subtle-tag">Media + P10–P90</span></div>
      <CurveChart result={result} /><p className="muted">P10–P90 es el rango empírico central de las ejecuciones; no es un intervalo de confianza del promedio.</p>
    </section>
    <section className="panel comparison-panel" aria-labelledby="comparison-heading"><h2 id="comparison-heading">Mismos recursos. Tres decisiones.</h2><p className="muted">Las dos estrategias de vacunación comparten stock, límite diario, inicio y eficacia. Cada intento consume una dosis.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Comparación de estrategias"><table><caption>Media y mínimo–máximo por estrategia, en {result.config.repetitions} repeticiones</caption><thead><tr><th scope="col">Estrategia</th><th scope="col">Contagios acumulados</th><th scope="col">Pico de infectados</th><th scope="col">Dosis usadas</th></tr></thead><tbody>{STRATEGIES.map(key => <tr key={key} className={key === 'targeted' ? 'highlight-row' : ''}><th scope="row"><i className={`line-key ${key}`} />{STRATEGY_NAMES[key]}<small>{key === 'none' ? 'Sin vacunas' : key === 'random' ? 'Susceptibles elegidos uniformemente' : 'Susceptibles con más contactos'}</small></th><td><Statistic stats={result.strategies[key].totalInfected} /></td><td><Statistic stats={result.strategies[key].peakInfected} /></td><td><Statistic stats={result.strategies[key].dosesUsed} /></td></tr>)}</tbody></table></div>
      <p className="muted">Los acumulados incluyen los infectados iniciales. Las dosis utilizadas pueden diferir si faltan personas elegibles.</p>
    </section>
    <ContactNetwork key={revision} result={result} />
    <section className="panel recommendation" aria-labelledby="recommendation-heading"><div className="section-title"><span>04</span><h2 id="recommendation-heading">Decidir con evidencia</h2></div>
      <h3>{result.avoidedVsRandom.mean > 0 ? 'Priorizar contactos mejora la media frente al azar.' : result.avoidedVsRandom.mean < 0 ? 'Vacunar al azar obtiene una media mejor en este escenario.' : 'No hay diferencia media frente a vacunar al azar.'}</h3>
      <p><b>Frente a no intervenir: </b>{recommendation(result.avoidedVsNone)}</p><p><b>Frente a vacunar al azar: </b>{recommendation(result.avoidedVsRandom)}</p><p className="muted">Son diferencias pareadas de contagios acumulados. Un valor negativo indica más contagios con la estrategia por contactos. No se ha buscado una estrategia óptima.</p>
    </section>
    <details className="panel limitations"><summary>Supuestos y límites del experimento</summary><p>La red se genera una vez y permanece fija entre repeticiones. En cada repetición, las tres estrategias comparten infectados iniciales y eventos aleatorios comparables. El día 0 no tiene acciones.</p><ul>{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul><p>La vacunación priorizada ordena susceptibles por grado total de la red y desempata por ID. Un intento fallido deja a la persona susceptible, sin permitir otra dosis.</p><p>Contrato {result.contractVersion}. La configuración completa y el resultado se incluyen en la exportación JSON.</p></details>
  </>
}
