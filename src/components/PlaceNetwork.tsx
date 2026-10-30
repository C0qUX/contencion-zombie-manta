import { useEffect, useMemo, useRef, useState } from 'react'
import { LOCATIONS, type ComparisonResult, type StrategyId, type ZoneState } from '../domain/simulation'
import { INITIAL_MAP_VIEW, MAP_ANCHORS, MAP_HEIGHT, MAP_WIDTH, mapPosition, mapTiles, zoomView } from '../features/map'
const states: { key: keyof ZoneState; name: string; color: string }[] = [
  { key: 'susceptible', name: 'S · Susceptibles', color: '#8ec9ed' },
  { key: 'exposed', name: 'E · Expuestos', color: '#ffd078' },
  { key: 'infected', name: 'I · Infecciosos', color: '#ff6e88' },
  { key: 'recovered', name: 'R · Recuperados', color: '#b7a2f5' },
  { key: 'vaccinated', name: 'V · Protegidos', color: '#57dfbf' },
]
const n = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)
export function PlaceNetwork({ result }: { result: ComparisonResult }) {
  const [strategy, setStrategy] = useState<StrategyId>('targeted')
  const [day, setDay] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [place, setPlace] = useState(2)
  const [showStreets, setShowStreets] = useState(true)
  const [tileFailed, setTileFailed] = useState(false)
  const [speed, setSpeed] = useState(500)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [view, setView] = useState(INITIAL_MAP_VIEW)
  const section = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const gesture = useRef<{ x: number; y: number; scale: number } | null>(null)
  const tiles = useMemo(() => mapTiles(view), [view])
  useEffect(() => {
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: 0.1 })
    if (section.current) observer.observe(section.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => { setReduced(media.matches); if (media.matches) setPlaying(false) }
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  useEffect(() => { setDay(0); setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) }, [result])
  useEffect(() => {
    if (!playing || reduced || !visible) return
    const timer = window.setInterval(() => setDay(current => Math.min(current + 1, result.config.days)), speed)
    return () => window.clearInterval(timer)
  }, [playing, speed, reduced, visible, result.config.days])
  useEffect(() => { if (day >= result.config.days) setPlaying(false) }, [day, result.config.days])
  const run = result.example[strategy]
  const hasHistory = !!run.zonesTimeline && run.zonesTimeline.length === result.config.days + 1
  const shownDay = hasHistory ? Math.min(day, result.config.days) : result.config.days
  const zones = hasHistory ? run.zonesTimeline![shownDay] : run.finalZones
  const doses = run.dosesTimeline?.[shownDay] ?? run.dosesByLocation
  const totals = zones.reduce((sum, zone) => {
    states.forEach(state => { sum[state.key] += zone[state.key] }); return sum
  }, { susceptible: 0, exposed: 0, infected: 0, recovered: 0, vaccinated: 0 })
  const chosen = zones[place], summary = result[strategy]
  const currentCases = totals.exposed + totals.infected + totals.recovered
  const previous = run.timeline[Math.max(0, shownDay - 1)]
  const newCases = shownDay > 0 ? currentCases - previous.exposed - previous.infected - previous.recovered : 0
  const interventionActive = shownDay >= result.config.interventionDay && result.config.vaccinesPerDay > 0 && strategy !== 'none'
  return <section ref={section} id="mapa-manta" className="panel places live-map" aria-labelledby="manta-map-title">
    <p className="eyebrow">MANTA · EVOLUCIÓN DEL BROTE</p><h2 id="manta-map-title">El brote, día a día</h2>
    <p>Semilla <b>{result.config.seed}</b> · corrida <b>1 de {result.config.runs}</b>. Trayectoria ilustrativa; los indicadores del resumen usan todas las corridas.</p>
    <div className="map-controls">
      <label>Estrategia ilustrada<select value={strategy} onChange={event => setStrategy(event.target.value as StrategyId)}>{[result.targeted, result.random, result.none].map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Velocidad<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={1000}>1 día / segundo</option><option value={500}>2 días / segundo</option><option value={200}>5 días / segundo</option></select></label>
      <button disabled={!hasHistory || reduced} onClick={() => { if (day >= result.config.days) setDay(0); setPlaying(value => !value) }}>{playing ? 'Pausar mapa' : 'Reproducir mapa'}</button>
      <button onClick={() => { setPlaying(false); setDay(0) }} disabled={!hasHistory}>Volver al día 0</button>
    </div>
    {reduced && <p>Movimiento reducido: avanza con el control de día; la reproducción automática está desactivada.</p>}
    {!hasHistory && <p>Este resultado anterior no contiene historial por lugar; se muestra solo el estado final.</p>}
    <label className="map-day" htmlFor="map-day">Día ilustrado: <b>{shownDay} / {result.config.days}</b><input id="map-day" type="range" min="0" max={result.config.days} step="1" value={shownDay} disabled={!hasHistory} onChange={event => { setPlaying(false); setDay(Number(event.target.value)) }} /></label>
    <div className="map-live-status"><span className={playing ? 'live-indicator active' : 'live-indicator'} /> <b>Día {shownDay}</b><span>{shownDay === 0 ? 'Inicio del brote' : interventionActive ? 'Intervención en marcha' : strategy === 'none' ? 'Sin intervención' : 'Antes de la intervención'}</span><span>+{n(newCases)} nuevas exposiciones hoy</span></div>
    <div className="map-viewport-tools" aria-label="Navegación del mapa"><button aria-label="Acercar mapa" disabled={view.zoom >= 16} onClick={() => setView(value => zoomView(value, 1))}>+ Acercar</button><button aria-label="Alejar mapa" disabled={view.zoom <= 12} onClick={() => setView(value => zoomView(value, -1))}>− Alejar</button><button onClick={() => setView(INITIAL_MAP_VIEW)}>Centrar Manta</button><small>Arrastra el mapa para explorar · zoom {view.zoom}</small></div>
    <div className="map-canvas">
      <svg viewBox={'0 0 ' + MAP_WIDTH + ' ' + MAP_HEIGHT} aria-labelledby="map-svg-title map-svg-desc" role="img"
        onPointerDown={event => { if ((event.target as Element).closest('[role="button"]')) return; const rect = event.currentTarget.getBoundingClientRect(); gesture.current = { x: event.clientX, y: event.clientY, scale: MAP_WIDTH / rect.width }; event.currentTarget.setPointerCapture(event.pointerId) }}
        onPointerMove={event => { const start = gesture.current; if (start) setDrag({ x: (event.clientX - start.x) * start.scale, y: (event.clientY - start.y) * start.scale }) }}
        onPointerUp={event => { const start = gesture.current; if (!start) return; const dx = (event.clientX - start.x) * start.scale, dy = (event.clientY - start.y) * start.scale; setView(value => { const limit = 1200 * 2 ** (value.zoom - 13); return { ...value, panX: Math.max(-limit, Math.min(limit, value.panX - dx)), panY: Math.max(-limit, Math.min(limit, value.panY - dy)) } }); gesture.current = null; setDrag({ x: 0, y: 0 }) }}
        onPointerCancel={() => { gesture.current = null; setDrag({ x: 0, y: 0 }) }}>
        <title id="map-svg-title">Manta, día {shownDay}, {summary.label}</title>
        <desc id="map-svg-desc">Cinco grupos sintéticos ubicados en anclas ilustrativas. {totals.infected} infecciosos, {totals.vaccinated} protegidos. No son ciudadanos, instituciones ni casos sanitarios localizados.</desc>
        <defs><pattern id="city-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#34566a" strokeWidth=".7" /></pattern></defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="#102c3c" /><rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#city-grid)" />
        <text x="20" y="32" className="map-area-name">MANTA · ECUADOR</text><text x="20" y="55">Anclas geográficas ilustrativas</text>
        <g transform={'translate(' + drag.x + ' ' + drag.y + ')'}>
        {showStreets && visible && !tileFailed && tiles.map(tile => <image key={tile.id} href={tile.url} x={tile.x} y={tile.y} width="256" height="256" onError={() => setTileFailed(true)} />)}
        <g className={'map-links' + (playing && !reduced ? ' map-flowing' : '')}>{MAP_ANCHORS.flatMap((anchor, index) => MAP_ANCHORS.slice(index + 1).map((other, j) => { const a = mapPosition(anchor.lat, anchor.lon, view), b = mapPosition(other.lat, other.lon, view); return <line key={index + '-' + j} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> }))}</g>
        {LOCATIONS.map((location, index) => {
          const zone = zones[index], position = mapPosition(MAP_ANCHORS[index].lat, MAP_ANCHORS[index].lon, view)
          const population = states.reduce((sum, state) => sum + zone[state.key], 0)
          const infectedShare = zone.infected / population
          let offset = 0
          return <g key={location.id} role="button" tabIndex={0} aria-label={location.label + ': ' + zone.infected + ' infecciosos, día ' + shownDay} onClick={() => setPlace(index)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPlace(index) } }}>
            <title>{location.label}: S {zone.susceptible}, E {zone.exposed}, I {zone.infected}, R {zone.recovered}, V {zone.vaccinated}</title>
            <circle className={playing && zone.infected > 0 && !reduced ? 'map-outbreak-pulse' : ''} cx={position.x} cy={position.y} r={36 + Math.min(.7, infectedShare) * 36} fill="#ff5279" opacity={.08 + infectedShare * .5} />
            <circle cx={position.x} cy={position.y} r="30" fill="#071a29" stroke={place === index ? 'white' : '#527890'} strokeWidth={place === index ? 3 : 1} />
            {states.map(state => { const fraction = zone[state.key] / population, start = offset; offset += fraction; return <circle key={state.key} cx={position.x} cy={position.y} r="24" fill="none" stroke={state.color} strokeWidth="7" pathLength="100" strokeDasharray={fraction * 100 + ' ' + (100 - fraction * 100)} strokeDashoffset={-start * 100} transform={'rotate(-90 ' + position.x + ' ' + position.y + ')'} /> })}
            <text x={position.x} y={position.y + 4} textAnchor="middle" className="map-infected">{n(infectedShare * 100)}%</text>
            <rect x={position.x - 50} y={position.y + 34} width="100" height="23" rx="5" fill="#071a29" />
            <text x={position.x} y={position.y + 50} textAnchor="middle">{location.label}</text>
          </g>
        })}
        </g>
        <text x={MAP_WIDTH - 30} y="25" textAnchor="middle">N ↑</text>
      </svg>
      <span className="map-attribution">{showStreets && !tileFailed ? <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> : 'Esquema · sin datos sanitarios reales'}</span>
    </div>
    <div className="map-cartography"><button onClick={() => { setShowStreets(value => !value); setTileFailed(false) }}>{showStreets ? 'Usar fondo esquemático' : 'Mostrar calles de Manta (internet)'}</button>{tileFailed && <button onClick={() => setTileFailed(false)}>Reintentar calles</button>}<a href="https://www.openstreetmap.org/#map=13/-0.973/-80.722" target="_blank" rel="noreferrer">Abrir cartografía</a></div>
    {tileFailed && <p role="status">No se pudo cargar la cartografía. La simulación continúa con el fondo esquemático.</p>}
    <div className="map-legend">{states.map(state => <span key={state.key}><i style={{ background: state.color }} />{state.name}: <b>{n(totals[state.key])}</b></span>)}</div>
    <div className="map-day-metrics"><span><b>{n(currentCases)}</b> contagios acumulados</span><span><b>{n(totals.vaccinated)}</b> protegidos por vacuna</span><span><b>{n(doses.reduce((a, b) => a + b, 0))}</b> dosis utilizadas</span></div>
    <div className="map-location-tabs" aria-label="Inspeccionar grupos de contacto">{LOCATIONS.map((location, index) => <button key={location.id} aria-pressed={place === index} onClick={() => setPlace(index)}>{location.label}</button>)}</div>
    <h3>{LOCATIONS[place].label} · día {shownDay}</h3><p>Grupo sintético: {states.map(state => state.name.split(' · ')[1] + ' ' + n(chosen[state.key])).join(' · ')}. Dosis acumuladas: {n(doses[place])}.</p>
    <details><summary>Ver todos los lugares</summary><div className="table-scroll"><table><caption>Corrida 1, día {shownDay}, no promedios</caption><thead><tr><th>Lugar</th>{states.map(state => <th key={state.key}>{state.name}</th>)}<th>Dosis</th></tr></thead><tbody>{LOCATIONS.map((location, index) => <tr key={location.id}><th scope="row">{location.label}</th>{states.map(state => <td key={state.key}>{zones[index][state.key]}</td>)}<td>{doses[index]}</td></tr>)}</tbody></table></div></details>
    <details className="map-evidence"><summary>Impacto y alcance de este mapa</summary><p>Semilla {result.config.seed} · {result.config.runs} corridas de evaluación:</p><ul><li>Frente a no actuar: <b>{n(result.savedVsNone)}</b> contagios evitados medios, P10–P90 {n(result.pairedVsNone.p10)} a {n(result.pairedVsNone.p90)}.</li><li>Frente al azar: <b>{n(result.savedVsRandom)}</b>, P10–P90 {n(result.pairedVsRandom.p10)} a {n(result.pairedVsRandom.p90)}.</li></ul><p>{result.savedVsNone > 0 && result.savedVsRandom > 0 ? 'La dirigida reduce contagios en promedio frente a ambas referencias en este escenario.' : 'La dirigida no mejora ambas referencias en este escenario; revisa los parámetros y las diferencias.'} Los negativos se conservan y los percentiles no son intervalos de confianza.</p>
    <p>Las calles de OpenStreetMap son cartografía real; las cinco anclas, población, mezcla y casos son sintéticos. Ningún marcador identifica una institución o domicilio real. Los cambios de día y estrategia reutilizan el resultado calculado, sin alterar el azar. Cambia la semilla en los controles y pulsa Ejecutar para otro experimento.</p></details>
  </section>
}
