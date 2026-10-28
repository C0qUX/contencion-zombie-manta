import type { DayState } from '../domain/simulation'

type Props = { strategy: DayState[]; baseline: DayState[] }

const points = (data: DayState[], max: number, width: number, height: number) =>
  data.map((item, index) => {
    const x = (index / Math.max(1, data.length - 1)) * width
    const y = height - (item.infected / Math.max(1, max)) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

export function CurveChart({ strategy, baseline }: Props) {
  const width = 760
  const height = 250
  const maximum = Math.max(...strategy.map(d => d.infected), ...baseline.map(d => d.infected))
  return (
    <div className="chart-wrap" aria-label="Comparación de personas infectadas por día">
      <svg viewBox={`0 0 ${width} ${height + 28}`} role="img">
        {[0, .25, .5, .75, 1].map(ratio => (
          <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} className="grid-line" />
        ))}
        <polyline points={points(baseline, maximum, width, height)} className="curve baseline" />
        <polyline points={points(strategy, maximum, width, height)} className="curve strategy" />
        <text x="0" y={height + 22}>Día 0</text>
        <text x={width - 48} y={height + 22}>Día {strategy.at(-1)?.day}</text>
      </svg>
      <div className="legend"><span><i className="dot cyan" />Estrategia</span><span><i className="dot red" />Sin intervenir</span></div>
    </div>
  )
}
