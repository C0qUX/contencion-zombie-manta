import { useEffect, useState } from 'react'
import { LOCATIONS, type ComparisonResult, type StrategyId, type ZoneState } from '../domain/simulation'
const positions = [[130, 90], [390, 65], [650, 90], [240, 245], [540, 245]]
const states: { key: keyof ZoneState; label: string; title: string }[] = [
  { key: 'susceptible', label: 'S', title: 'Sano' }, { key: 'exposed', label: 'E', title: 'Mordido' },
  { key: 'infected', label: 'I', title: 'Zombie' }, { key: 'recovered', label: 'R', title: 'Exorcizado' },
  { key: 'vaccinated', label: 'V', title: 'Vacunado' },
]
export function PlaceNetwork({ result }: { result: ComparisonResult }) {
  const [strategy, setStrategy] = useState<StrategyId>('targeted')
  const days = result.config.days
  const [day, setDay] = useState(days)
  const [playing, setPlaying] = useState(false)
  useEffect(() => { setDay(result.config.days); setPlaying(false) }, [result])
  useEffect(() => {
    if (!playing) return
    if (day >= days) { setPlaying(false); return }
    const timer = window.setTimeout(() => setDay(day + 1), 110)
    return () => window.clearTimeout(timer)
  }, [playing, day, days])
  const run = result.example[strategy]
  const zones = run.zoneTimeline?.[day] ?? run.finalZones
  const shown = run.zoneTimeline ? day : days
  return <section className="panel places"><h2>Lugares de Manta · esquema sintético</h2><p>Corrida 1 de {result.config.runs}, día a día; es un ejemplo individual y puede diferir de la media.</p>
    <div className="place-controls">
      <label>Estrategia ilustrada<select value={strategy} onChange={event => setStrategy(event.target.value as StrategyId)}>{[result.targeted, result.random, result.none].map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      {run.zoneTimeline && <>
        <label className="day-slider"><span>Día {shown} de {days}{strategy !== 'none' && shown >= result.config.interventionDay ? ' · vacunación activa' : ''}</span><input type="range" min={0} max={days} value={day} aria-label="Día ilustrado" onChange={event => { setPlaying(false); setDay(Number(event.target.value)) }} /></label>
        <button type="button" onClick={() => { if (!playing && day >= days) setDay(0); setPlaying(!playing) }}>{playing ? '⏸ Pausar' : '▶ Reproducir brote'}</button>
      </>}
    </div>
    <p className="state-legend" aria-hidden="true">{states.map(state => <span key={state.key}><i className={'seg-' + state.label.toLowerCase()} />{state.label} {state.title}</span>)}</p>
    <svg viewBox="0 0 780 330" role="img" aria-labelledby="places-title places-desc"><title id="places-title">Cinco grupos agregados, día {shown}</title><desc id="places-desc">Esquema de mezcla, sin coordenadas ni movilidad reales. Porcentaje infeccioso y barra con la proporción S/E/I/R/V de cada grupo; conteos completos en la tabla.</desc>
      {positions.flatMap((position, index) => positions.slice(index + 1).map((other, offset) => <line key={index + '-' + offset} x1={position[0]} y1={position[1]} x2={other[0]} y2={other[1]} className="place-edge" />))}
      {LOCATIONS.map((place, index) => {
        const zone = zones[index], [x, y] = positions[index]
        const population = Math.max(1, zone.susceptible + zone.exposed + zone.infected + zone.recovered + zone.vaccinated)
        let offset = x - 60
        return <g key={place.id}><circle cx={x} cy={y} r="43" className="place-node" style={{ fillOpacity: 0.35 + 0.65 * Math.min(1, zone.infected / population * 8) }} /><text x={x} y={y - 3} textAnchor="middle">{place.label}</text><text x={x} y={y + 18} textAnchor="middle">{(zone.infected / population * 100).toFixed(1)} % I</text>
          {states.map(state => { const width = 120 * zone[state.key] / population; const segment = <rect key={state.key} x={offset} y={y + 52} width={width} height={10} className={'seg-' + state.label.toLowerCase()} />; offset += width; return segment })}
          <text x={x} y={y + 80} textAnchor="middle" className="place-note">V {zone.vaccinated} · R {zone.recovered}</text></g>
      })}
    </svg>
    <div className="table-scroll"><table><caption>Conteos del día {shown} de la corrida ilustrada, no promedios (S: Sano · E: Mordido · I: Zombie · R: Exorcizado · V: Vacunado). Dosis: total de la corrida</caption><thead><tr><th>Lugar</th><th title="Sano (susceptible)">S (Sano)</th><th title="Mordido (expuesto)">E (Mordido)</th><th title="Zombie (infeccioso)">I (Zombie)</th><th title="Exorcizado (recuperado)">R (Exorcizado)</th><th title="Vacunado">V (Vacuna)</th><th>Dosis</th></tr></thead><tbody>{LOCATIONS.map((place, index) => { const zone = zones[index]; return <tr key={place.id}><th scope="row">{place.label}</th>{[zone.susceptible, zone.exposed, zone.infected, zone.recovered, zone.vaccinated, run.dosesByLocation[index]].map((value, i) => <td key={i}>{value}</td>)}</tr> })}</tbody></table></div>
    <p>Las líneas representan mezcla entre grupos, no contactos individuales. Priorización inicial media dirigida: {LOCATIONS.map((place, i) => place.label + ' ' + result.targeted.meanFirstAllocation[i].toFixed(1)).join(' · ')} dosis.</p>
  </section>
}
