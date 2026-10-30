import { useEffect, useState } from 'react'
import type { ComparisonResult } from '../domain/simulation'
import { createMayorReport } from '../features/mayor-report'
export function MayorReport({ result, finished }: { result: ComparisonResult; finished: boolean }) {
  const [url,setUrl] = useState(''), [error,setError] = useState(''), [retry,setRetry] = useState(0)
  useEffect(()=>{
    if (!finished) { setUrl(''); return }
    let cancelled=false, objectUrl=''
    setUrl(''); setError('')
    createMayorReport(result).then(bytes=>{
      if (cancelled) return
      objectUrl=URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type:'application/pdf'})); setUrl(objectUrl)
    }).catch(()=>{if(!cancelled)setError('No se pudo preparar el PDF. Puedes reintentarlo.')})
    return ()=>{cancelled=true;if(objectUrl)URL.revokeObjectURL(objectUrl)}
  },[result,finished,retry])
  if (!finished) return null
  return <section className="mayor-report" aria-label="Informe para el alcalde"><div><p className="eyebrow">RECORRIDO COMPLETADO</p><h3>Terminamos los {result.config.days} días. ¿Qué decidimos?</h3><p role="status">{error || (url ? 'Tu informe está listo: recomendación, vacunas, presupuesto y comparación de planes.' : 'Preparando automáticamente el informe PDF…')}</p></div>{url && <a className="configure-link" href={url} download={'7DaysToSurvive-alcalde-semilla-'+result.config.seed+'.pdf'}>Descargar informe PDF</a>}{error && <button onClick={()=>setRetry(v=>v+1)}>Reintentar PDF</button>}</section>
}
