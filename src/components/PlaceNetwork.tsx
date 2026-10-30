import { useState } from 'react'
import { LOCATIONS, type ComparisonResult, type StrategyId } from '../domain/simulation'
const positions = [[130, 90], [390, 65], [650, 90], [240, 245], [540, 245]]
export function PlaceNetwork({ result }: { result: ComparisonResult }) {
  const [strategy, setStrategy] = useState<StrategyId>('targeted')
  const run = result.example[strategy]
  return <section className="panel places"><h2>Lugares de Manta · esquema sintético</h2><p>Resultado final de la corrida 1 de {result.config.runs}; es un ejemplo individual y puede diferir de la media.</p>
    <label>Estrategia ilustrada<select value={strategy} onChange={event => setStrategy(event.target.value as StrategyId)}>{[result.targeted, result.random, result.none].map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
    <svg viewBox="0 0 780 330" role="img" aria-labelledby="places-title places-desc"><title id="places-title">Cinco grupos agregados, día {result.config.days}</title><desc id="places-desc">Esquema de mezcla, sin coordenadas ni movilidad reales. Porcentaje infeccioso por grupo; conteos completos en la tabla.</desc>
      {positions.flatMap((position, index) => positions.slice(index + 1).map((other, offset) => <line key={index + '-' + offset} x1={position[0]} y1={position[1]} x2={other[0]} y2={other[1]} className="place-edge" />))}
      {LOCATIONS.map((place, index) => {
        const zone = run.finalZones[index], [x, y] = positions[index]
        const population = zone.susceptible + zone.exposed + zone.infected + zone.recovered + zone.vaccinated
        return <g key={place.id}><circle cx={x} cy={y} r="43" className="place-node" /><text x={x} y={y - 3} textAnchor="middle">{place.label}</text><text x={x} y={y + 18} textAnchor="middle">{(zone.infected / population * 100).toFixed(1)} % I</text><text x={x} y={y + 62} textAnchor="middle">{run.dosesByLocation[index]} dosis</text></g>
      })}
    </svg>
    <div className="table-scroll"><table><caption>Conteos al final de la corrida ilustrada, no promedios</caption><thead><tr><th>Lugar</th><th>S</th><th>E</th><th>I</th><th>R</th><th>V</th><th>Dosis</th></tr></thead><tbody>{LOCATIONS.map((place, index) => { const zone = run.finalZones[index]; return <tr key={place.id}><th scope="row">{place.label}</th>{[zone.susceptible, zone.exposed, zone.infected, zone.recovered, zone.vaccinated, run.dosesByLocation[index]].map((value, i) => <td key={i}>{value}</td>)}</tr> })}</tbody></table></div>
    <p>Las líneas representan mezcla entre grupos, no contactos individuales. Priorización inicial media dirigida: {LOCATIONS.map((place, i) => place.label + ' ' + result.targeted.meanFirstAllocation[i].toFixed(1)).join(' · ')} dosis.</p>
  </section>
}
