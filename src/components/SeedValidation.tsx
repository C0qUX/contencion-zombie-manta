import { useEffect, useRef, useState } from 'react'
import type { ComparisonResult } from '../domain/simulation'
import { createClient } from '../features/client'
type Row = { seed: number; affected: number; savedVsNone: number; savedVsRandom: number; p10: number; p90: number }
const n = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)
export function SeedValidation({ result }: { result: ComparisonResult }) {
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const client = useRef<ReturnType<typeof createClient> | null>(null)
  const start = useRef<() => void>(() => {})
  const seeds = [...new Set([result.config.seed, 2026, 42, 12345, 98765, 314159])].slice(0, 5)
  useEffect(() => {
    let index = 0
    const selected = [...new Set([result.config.seed, 2026, 42, 12345, 98765, 314159])].slice(0, 5)
    const next = () => {
      if (index >= selected.length) { setBusy(false); setMessage('Batería completa: cinco semillas evaluadas.'); return }
      setMessage('Evaluando semilla ' + selected[index] + ' (' + (index + 1) + '/5)…')
      client.current!.run({ ...result.config, seed: selected[index] })
    }
    client.current = createClient(response => {
      if (response.type === 'result') {
        const value = response.result
        setRows(current => [...current, { seed: value.config.seed, affected: value.targeted.meanAffected, savedVsNone: value.savedVsNone, savedVsRandom: value.savedVsRandom, p10: value.pairedVsRandom.p10, p90: value.pairedVsRandom.p90 }])
        index++; next()
      } else if (response.type === 'error') { setBusy(false); setMessage(response.message) }
    })
    start.current = () => { index = 0; setRows([]); setBusy(true); next() }
    setRows([]); setBusy(false); setMessage('')
    return () => { client.current?.cancel(); client.current = null }
  }, [result])
  const passed = rows.filter(row => row.savedVsNone > 0 && row.savedVsRandom > 0).length
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ algorithmVersion: result.algorithmVersion, config: result.config, requestedSeeds: seeds, completed: rows.length, rows }, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = '7DaysToSurvive-bateria-semillas.json'; anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <section className="panel seed-validation" aria-labelledby="seed-validation-title"><h2 id="seed-validation-title">¿Funciona con otras partidas?</h2>
    <p>Cambia el número de partida y comprueba si el plan sigue funcionando. Esta prueba usa cinco números distintos y compara los mismos tres planes cada vez.</p>
    <details><summary>Cómo se hace la prueba</summary><p>Para cada semilla se realizan {result.config.runs} corridas con el mismo stock y calendario. La regla se elige en futuros de calibración distintos de los que se muestran. Se cuentan mejoras medias frente al azar y a no actuar; también se conservan pérdidas y empates.</p></details>
    <div className="report-actions"><button disabled={busy} onClick={() => start.current()}>Evaluar cinco semillas</button>{busy && <button onClick={() => { client.current?.cancel(); setBusy(false); setMessage('Batería cancelada. Solo se muestran las semillas completadas.') }}>Cancelar batería</button>}{rows.length > 0 && <button onClick={download}>Exportar batería JSON</button>}</div>
    <p role="status">{message}</p>
    {rows.length > 0 && <><p><b>{passed} de {rows.length} semillas completadas</b> mejoran ambas referencias en media. {rows.length < 5 ? 'Resultado parcial.' : 'Esto es evidencia del escenario, no una garantía universal.'}</p><div className="table-scroll"><table><caption>Diferencias firmadas de contagios; positivos indican mejora de la dirigida</caption><thead><tr><th>Semilla</th><th>Contagios dirigidos</th><th>Evitados vs. ninguna</th><th>Evitados vs. azar</th><th>P10–P90 vs. azar</th><th>Criterio</th></tr></thead><tbody>{rows.map(row => <tr key={row.seed}><th scope="row">{row.seed}</th><td>{n(row.affected)}</td><td className={row.savedVsNone < 0 ? 'negative' : ''}>{n(row.savedVsNone)}</td><td className={row.savedVsRandom < 0 ? 'negative' : ''}>{n(row.savedVsRandom)}</td><td>{n(row.p10)} a {n(row.p90)}</td><td>{row.savedVsNone > 0 && row.savedVsRandom > 0 ? 'Mejora media' : 'No mejora ambas'}</td></tr>)}</tbody></table></div></>}
    <p>Estos resultados son de una ciudad simulada. No representan casos reales de Manta.</p>
  </section>
}
