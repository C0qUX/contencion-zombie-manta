import type { StrategySummary } from '../domain/simulation'
type Props = { targeted: StrategySummary; random: StrategySummary; none: StrategySummary; interventionDay: number }
export function CurveChart({ targeted, random, none, interventionDay }: Props) {
  const width = 780, height = 300, left = 52, top = 20, plotWidth = 704, plotHeight = 230
  const strategies = [targeted, random, none]
  const maximum = Math.max(1, ...strategies.flatMap(strategy => strategy.timeline.map(day => Math.max(day.p90, day.mean))))
  const days = targeted.timeline.length - 1
  const x = (day: number) => left + day / Math.max(1, days) * plotWidth
  const y = (value: number) => top + plotHeight - value / maximum * plotHeight
  const line = (strategy: StrategySummary) => strategy.timeline.map(day => x(day.day) + ',' + y(day.mean)).join(' ')
  const band = (strategy: StrategySummary) => [
    ...strategy.timeline.map(day => x(day.day) + ',' + y(day.p90)),
    ...[...strategy.timeline].reverse().map(day => x(day.day) + ',' + y(day.p10)),
  ].join(' ')
  return <div className="chart-wrap">
    <div className="legend">{strategies.map(strategy => <span key={strategy.id}><i className={'line-key ' + strategy.id} />{strategy.label}</span>)}</div>
    <svg viewBox={'0 0 ' + width + ' ' + height} role="img" aria-labelledby="curve-title curve-desc">
      <title id="curve-title">Infecciosos activos: medias y bandas P10–P90</title>
      <desc id="curve-desc">Tres estrategias durante {days} días. Línea vertical: comienzo de intervención, día {interventionDay}. La tabla diaria permite consultar los valores.</desc>
      {[0, .25, .5, .75, 1].map(ratio => <g key={ratio}><line x1={left} x2={width - 24} y1={y(maximum * ratio)} y2={y(maximum * ratio)} className="grid-line" /><text x={left - 8} y={y(maximum * ratio) + 4} textAnchor="end">{Math.round(maximum * ratio)}</text></g>)}
      {Array.from(new Set([0, 1, 2, 3, 4].map(i => Math.round(days * i / 4)))).map(day => <text key={day} x={x(day)} y={height - 20} textAnchor="middle">{day}</text>)}
      {strategies.map(strategy => <polygon key={strategy.id} points={band(strategy)} className={'range-band ' + strategy.id} />)}
      {strategies.map(strategy => <polyline key={strategy.id} points={line(strategy)} className={'curve ' + strategy.id} />)}
      {interventionDay <= days && <g><line x1={x(interventionDay)} x2={x(interventionDay)} y1={top} y2={top + plotHeight} className="intervention-line" /><text x={x(interventionDay) + (interventionDay > days * .7 ? -5 : 5)} textAnchor={interventionDay > days * .7 ? 'end' : 'start'} y={top - 6}>Inicio: día {interventionDay}</text></g>}
    </svg>
    <p className="chart-caption">La sombra alrededor de cada línea muestra cuánto cambian los resultados entre distintas partidas. La línea vertical marca el primer día de vacunación.</p>
    <details><summary>Consultar datos diarios</summary><div className="table-scroll"><table><caption>Media [P10–P90] de infecciosos</caption><thead><tr><th>Día</th>{strategies.map(strategy => <th key={strategy.id}>{strategy.label}</th>)}</tr></thead><tbody>{targeted.timeline.map((day, index) => <tr key={day.day}><th scope="row">{day.day}</th>{strategies.map(strategy => { const values = strategy.timeline[index]; return <td key={strategy.id}>{values.mean.toFixed(1)} [{values.p10.toFixed(1)}–{values.p90.toFixed(1)}]</td> })}</tr>)}</tbody></table></div></details>
  </div>
}
