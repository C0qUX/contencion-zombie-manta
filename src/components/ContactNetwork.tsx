import { useEffect, useMemo, useState } from 'react'
import type { ExperimentResult, HealthState, Strategy, Zone } from '../shared/simulation-contract'
import { STRATEGIES, STRATEGY_NAMES } from '../features/simulation/scenario'

const STATES: HealthState[] = ['S', 'I', 'R', 'V']
const STATE_NAMES = { S: 'Susceptibles', I: 'Infectados', R: 'Recuperados', V: 'Inmunizados por vacuna' }
const ZONE_NAMES: Record<Zone, string> = { home: 'Hogares', school: 'Colegio', market: 'Mercado', transport: 'Transporte' }
const CENTERS: Record<Zone, [number, number]> = { home: [180, 102], school: [560, 102], market: [180, 300], transport: [560, 300] }

export function ContactNetwork({ result }: { result: ExperimentResult }) {
  const [strategy, setStrategy] = useState<Strategy>('targeted')
  const [day, setDay] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const stop = () => { if (reduced.matches) setPlaying(false) }
    reduced.addEventListener('change', stop)
    return () => reduced.removeEventListener('change', stop)
  }, [])
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setDay(current => Math.min(current + 1, result.config.days)), 650)
    return () => window.clearInterval(timer)
  }, [playing, result.config.days])
  useEffect(() => { if (day === result.config.days) setPlaying(false) }, [day, result.config.days])
  const positions = useMemo(() => {
    const groups: Record<Zone, number[]> = { home: [], school: [], market: [], transport: [] }
    // Choose one of each person's actual settings for display only. Membership
    // is overlapping in the model; this assignment never changes graph edges.
    for (const node of result.example.graph.nodes) groups[node.zones[node.id % node.zones.length]].push(node.id)
    const output: [number, number][] = []
    for (const zone of Object.keys(groups) as Zone[]) {
      groups[zone].forEach((id, index) => {
        const angle = index * 2.399963229728653
        const radius = 73 * Math.sqrt((index + .5) / groups[zone].length)
        output[id] = [CENTERS[zone][0] + Math.cos(angle) * radius, CENTERS[zone][1] + Math.sin(angle) * radius]
      })
    }
    return output
  }, [result.example.graph])
  const snapshot = result.example.timelines[strategy][day]
  const counts = { S: snapshot.susceptible, I: snapshot.infected, R: snapshot.recovered, V: snapshot.vaccinated }
  const radius = result.config.population > 600 ? 2.5 : 3.3
  return <section className="panel network-panel" aria-labelledby="network-title">
    <div className="section-heading"><div><div className="section-title"><span>03</span><h2 id="network-title">Dentro de la red</h2></div><p>Repetición 1 de {result.config.repetitions}: ejemplo individual</p></div><span className="subtle-tag">Día {day} / {result.config.days}</span></div>
    <div className="network-toolbar"><label>Estrategia ilustrada<select value={strategy} onChange={e => setStrategy(e.target.value as Strategy)}>{STRATEGIES.map(key => <option value={key} key={key}>{STRATEGY_NAMES[key]}</option>)}</select></label>
      <button onClick={() => { if (day === result.config.days) setDay(0); setPlaying(value => !value) }}>{playing ? 'Pausar animación' : 'Reproducir animación'}</button>
    </div>
    <svg className="network-svg" viewBox="0 0 740 412" role="img" aria-labelledby="network-svg-title network-svg-description">
      <title id="network-svg-title">Red sintética, día {day}, {STRATEGY_NAMES[strategy]}</title>
      <desc id="network-svg-description">{result.config.population} personas, {result.example.graph.edges.length} contactos. {snapshot.susceptible} susceptibles, {snapshot.infected} infectados, {snapshot.recovered} recuperados y {snapshot.vaccinated} inmunizados. Posiciones ilustrativas estables, sin coordenadas geográficas.</desc>
      {(Object.keys(CENTERS) as Zone[]).map(zone => <g key={zone}><circle cx={CENTERS[zone][0]} cy={CENTERS[zone][1]} r="85" className="network-cluster" /><text x={CENTERS[zone][0]} y={CENTERS[zone][1] + 102} textAnchor="middle">{ZONE_NAMES[zone]}</text></g>)}
      <g className="network-edges">{result.example.graph.edges.map(edge => <line key={`${edge.source}-${edge.target}`} x1={positions[edge.source][0]} y1={positions[edge.source][1]} x2={positions[edge.target][0]} y2={positions[edge.target][1]} />)}</g>
      {result.example.graph.nodes.map(node => {
        const [x, y] = positions[node.id], state = snapshot.states[node.id]
        const title = `Persona ${node.id}: ${STATE_NAMES[state]}. Contactos en ${node.zones.map(zone => ZONE_NAMES[zone]).join(', ')}.`
        return <g key={node.id} className={`person state-${state}`}><title>{title}</title>{state === 'I'
          ? <path d={`M ${x} ${y - radius - 1} l ${radius + 1} ${radius + 1} l ${-radius - 1} ${radius + 1} l ${-radius - 1} ${-radius - 1} Z`} />
          : state === 'R' ? <rect x={x - radius} y={y - radius} width={radius * 2} height={radius * 2} /> : <circle cx={x} cy={y} r={radius} />}</g>
      })}
    </svg>
    <div className="day-control"><label htmlFor="illustrated-day">Día ilustrado</label><output htmlFor="illustrated-day">{day}</output><input id="illustrated-day" type="range" min="0" max={result.config.days} step="1" value={day} onChange={e => { setPlaying(false); setDay(Number(e.target.value)) }} /></div>
    <div className="legend state-legend">{STATES.map(state => <span key={state}><i className={`state-symbol state-${state}`} /><b>{state}</b> {STATE_NAMES[state]}: {counts[state]}</span>)}</div>
    <p className="muted network-note">Cada nodo es una persona; cada línea, un contacto. Se agrupa visualmente a cada persona en uno de sus lugares de contacto; puede participar en varios. No es un mapa geográfico. La animación comienza pausada.</p>
  </section>
}
