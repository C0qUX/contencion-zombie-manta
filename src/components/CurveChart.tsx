import type { ExperimentResult, Strategy } from '../shared/simulation-contract'
import { formatNumber as n, STRATEGIES, STRATEGY_NAMES } from '../features/simulation/scenario'

export function CurveChart({ result }: { result: ExperimentResult }) {
  const width = 780, height = 300, left = 44, top = 16, plotWidth = 718, plotHeight = 244
  const maximum = Math.max(1, ...STRATEGIES.flatMap(key => result.strategies[key].daily.flatMap(d => [d.infected.p90, d.infected.mean])))
  const x = (day: number) => left + day / result.config.days * plotWidth
  const y = (value: number) => top + plotHeight - value / maximum * plotHeight
  const line = (strategy: Strategy) => result.strategies[strategy].daily.map(d => `${x(d.day)},${y(d.infected.mean)}`).join(' ')
  const band = (strategy: Strategy) => {
    const data = result.strategies[strategy].daily
    return [...data.map(d => `${x(d.day)},${y(d.infected.p90)}`), ...[...data].reverse().map(d => `${x(d.day)},${y(d.infected.p10)}`)].join(' ')
  }
  return <div className="chart-wrap">
    <div className="legend strategy-legend">{STRATEGIES.map(key => <span key={key}><i className={`line-key ${key}`} />{STRATEGY_NAMES[key]}</span>)}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="curve-title curve-description">
      <title id="curve-title">Infectados activos durante {result.config.days} días</title>
      <desc id="curve-description">Tres curvas de promedios con bandas de percentiles 10 a 90 de {result.config.repetitions} repeticiones. Los valores se pueden consultar en la tabla diaria.</desc>
      {[0, .25, .5, .75, 1].map(ratio => <g key={ratio}>
        <line x1={left} x2={width - 18} y1={y(maximum * ratio)} y2={y(maximum * ratio)} className="grid-line" />
        <text x={left - 9} y={y(maximum * ratio) + 4} textAnchor="end">{n(maximum * ratio)}</text>
      </g>)}
      {Array.from(new Set([0, ...[1, 2, 3, 4, 5].map(i => Math.round(result.config.days * i / 5))])).map(day => <text key={day} x={x(day)} y={height - 14} textAnchor="middle">{day}</text>)}
      {STRATEGIES.map(key => <polygon key={key} points={band(key)} className={`confidence-band ${key}`} />)}
      {STRATEGIES.map(key => <polyline key={key} points={line(key)} className={`curve ${key}`} />)}
    </svg>
    <p className="chart-caption">Días desde el inicio · Líneas: media de infectados activos · Bandas: P10–P90</p>
    <details className="daily-data"><summary>Consultar valores diarios</summary><div className="table-scroll" tabIndex={0} role="region" aria-label="Datos diarios de infectados activos">
      <table><caption>Media y P10–P90 de infectados activos</caption><thead><tr><th scope="col">Día</th>{STRATEGIES.map(key => <th scope="col" key={key}>{STRATEGY_NAMES[key]}</th>)}</tr></thead>
        <tbody>{result.strategies.none.daily.map((day, index) => <tr key={day.day}><th scope="row">{day.day}</th>{STRATEGIES.map(key => {
          const stats = result.strategies[key].daily[index].infected
          return <td key={key}>{n(stats.mean)} <small>{n(stats.p10)} a {n(stats.p90)}</small></td>
        })}</tr>)}</tbody>
      </table>
    </div></details>
  </div>
}
