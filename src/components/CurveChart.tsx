import type { AggregateDay, StrategySummary } from '../domain/simulation'

type Props = { targeted: StrategySummary; random: StrategySummary; none: StrategySummary }

const points = (data: AggregateDay[], field: keyof Pick<AggregateDay, 'mean' | 'p10' | 'p90'>, max: number, width: number, height: number) =>
  data.map((item, index) => {
    const x = (index / Math.max(1, data.length - 1)) * width
    const y = height - (item[field] / Math.max(1, max)) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

function band(data: AggregateDay[], max: number, width: number, height: number) {
  const top = points(data, 'p90', max, width, height)
  const bottom = data.map((item, reverseIndex) => {
    const index = data.length - 1 - reverseIndex
    const x = (index / Math.max(1, data.length - 1)) * width
    const y = height - (item.p10 / Math.max(1, max)) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return `${top} ${bottom}`
}

export function CurveChart({ targeted, random, none }: Props) {
  const width = 760
  const height = 250
  const maximum = Math.max(
    ...targeted.timeline.map(day => day.p90),
    ...random.timeline.map(day => day.p90),
    ...none.timeline.map(day => day.p90),
  )
  return (
    <div className="chart-wrap" aria-label="Promedio e intervalo percentil 10 a 90 de personas infecciosas">
      <svg viewBox={`0 0 ${width} ${height + 28}`} role="img">
        {[0, .25, .5, .75, 1].map(ratio => (
          <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} className="grid-line" />
        ))}
        <polygon points={band(targeted.timeline, maximum, width, height)} className="range-band" />
        <polyline points={points(none.timeline, 'mean', maximum, width, height)} className="curve baseline" />
        <polyline points={points(random.timeline, 'mean', maximum, width, height)} className="curve random" />
        <polyline points={points(targeted.timeline, 'mean', maximum, width, height)} className="curve strategy" />
        <text x="0" y={height + 22}>Día 0</text>
        <text x={width - 50} y={height + 22}>Día {targeted.timeline.at(-1)?.day}</text>
      </svg>
      <div className="legend">
        <span><i className="dot cyan" />7DaysToSurvive</span>
        <span><i className="dot amber" />Azar</span>
        <span><i className="dot red" />No intervenir</span>
        <span><i className="range-key" />Rango P10–P90</span>
      </div>
    </div>
  )
}
