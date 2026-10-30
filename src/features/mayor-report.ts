import type { ComparisonResult } from '../domain/simulation'
import { LOCATIONS } from '../domain/simulation'

export async function createMayorReport(result: ComparisonResult): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const ink = rgb(.08,.22,.15), green = rgb(.03,.44,.25), muted = rgb(.30,.38,.33)
  let page = pdf.addPage([595.28,841.89]), y = 790
  const n = (value: number) => new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)
  const money = (value: number) => 'USD ' + new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 }).format(value)
  const text = (value: string, size = 11, strong = false) => {
    const font = strong ? bold : regular
    let line = ''
    for (const word of value.split(/\s+/)) {
      if (font.widthOfTextAtSize(line + ' ' + word, size) > 505 && line) { page.drawText(line, { x: 45, y, size, font, color: ink }); y -= size * 1.55; line = '' }
      line += (line ? ' ' : '') + word
    }
    if (line) { page.drawText(line, { x:45, y, size, font, color: ink }); y -= size * 1.55 }
  }
  const heading = (value: string) => { y -= 14; text(value, 13, true); y -= 4 }
  const footer = (number: number) => { page.drawText('7DaysToSurvive | Escenario educativo | ' + number + ' / 2', { x:45, y:30, font:regular, size:9, color:muted }) }
  const c = result.config, strategies = [result.targeted, result.random, result.none]
  const names = { targeted:'Plan dirigido', random:'Vacunar al azar', none:'No intervenir' }
  const best = strategies.reduce((a,b) => a.meanAffected <= b.meanAffected ? a : b)
  const ties = strategies.filter(item => Math.abs(item.meanAffected - best.meanAffected) < .000001)
  const allocation = result.targeted.meanFirstAllocation
  const priority = LOCATIONS[allocation.indexOf(Math.max(...allocation))].label
  page.drawRectangle({ x:0,y:820,width:595.28,height:22,color:green })
  text('7DaysToSurvive', 24, true)
  text('Informe de decisiones para el alcalde de Manta', 15)
  text('Horizonte: ' + c.days + ' días | ' + c.runs + ' futuros simulados | Semilla: ' + c.seed, 10)
  heading('1. La decisión')
  text(ties.length > 1 ? 'Hay un empate en la menor media de contagios. No se declara un ganador único.' : 'El plan con menos contagios en promedio es: ' + names[best.id] + '.', 12, true)
  text(result.targeted.meanProtected > 0 ? 'Plan dirigido evaluado: empezar el día ' + c.interventionDay + ', con hasta ' + n(c.vaccinesPerDay) + ' dosis al día. Primera prioridad: ' + priority + '. La asignación se revisa cada día.' : 'Este plan no aporta protección vacunal efectiva dentro del horizonte evaluado.')
  heading('2. Comparación de los tres planes')
  for (const s of strategies) {
    text(names[s.id] + ': ' + n(s.meanAffected) + ' contagios medios.', 12, true)
    text('Mediana ' + n(s.medianAffected) + '; P10-P90: ' + n(s.p10Affected) + ' a ' + n(s.p90Affected) + '. Pico: ' + n(s.meanPeak) + ' infectados, día medio ' + n(s.meanPeakDay) + '.', 10)
    text('Dosis usadas: ' + n(s.meanDosesUsed) + '. Costo supuesto: ' + money(s.meanDosesUsed * (c.costPerDose ?? 0)) + '.', 10)
    y -= 7
  }
  heading('3. Impacto esperado e incertidumbre')
  text('Dirigida frente a no actuar: ' + n(result.savedVsNone) + ' contagios evitados medios; P10-P90 de ' + n(result.pairedVsNone.p10) + ' a ' + n(result.pairedVsNone.p90) + '.')
  text('Dirigida frente al azar: ' + n(result.savedVsRandom) + '; P10-P90 de ' + n(result.pairedVsRandom.p10) + ' a ' + n(result.pairedVsRandom.p90) + '.')
  text('Una cifra negativa significa que la dirigida tuvo más contagios. Los rangos muestran variación entre partidas, no intervalos de confianza de la media. No se garantiza ganar con cualquier escenario.',10)
  heading('4. Recursos y presupuesto del escenario')
  text('Stock: ' + n(c.totalVaccines ?? result.targeted.dosesAvailable) + ' dosis. Precio ficticio por dosis: ' + money(c.costPerDose ?? 0) + '. Presupuesto del stock: ' + money((c.totalVaccines ?? result.targeted.dosesAvailable) * (c.costPerDose ?? 0)) + '.',10)
  text('Ambos planes de vacunación tienen la misma capacidad, stock, inicio y eficacia. El consumo real puede diferir por la cantidad de personas elegibles. Los costos de intervención son supuestos, separados del hosting AWS.',10)
  footer(1)
  page = pdf.addPage([595.28,841.89]); y = 790
  text('Cómo reproducir y leer este informe',21,true)
  heading('Configuración aplicada')
  const rows = [
    'Versión: ' + result.algorithmVersion + '. Semilla: ' + c.seed + '. Corridas: ' + c.runs + '.',
    'Población ficticia: ' + n(c.population) + '. Casos infecciosos iniciales: ' + c.initialInfected + '. Origen: ' + LOCATIONS.find(p=>p.id===c.outbreakLocation)?.label + '.',
    'Duración: ' + c.days + ' días. Contagiosidad: ' + c.transmissionRate + '. Eficacia: ' + n(c.vaccineEfficacy * 100) + ' %.',
    'Inicio: día ' + c.interventionDay + '. Capacidad: ' + c.vaccinesPerDay + ' dosis/día. Stock: ' + (c.totalVaccines ?? result.targeted.dosesAvailable) + '.',
    'Progresión de expuesto a infeccioso: ' + c.incubationRate + '/día. Recuperación: ' + c.recoveryRate + '/día.',
  ]
  rows.forEach(value=>text(value))
  heading('Evolución media de las infecciones activas')
  const top = y - 5, height = 140, left = 55, width = 480
  const max = Math.max(1,...strategies.flatMap(s=>s.timeline.map(d=>d.mean)))
  const colors = [green,rgb(.8,.48,.1),rgb(.8,.12,.22)]
  page.drawLine({start:{x:left,y:top-height},end:{x:left+width,y:top-height},color:muted,thickness:.5})
  strategies.forEach((s,index)=>s.timeline.slice(1).forEach((d,i)=>{ page.drawLine({start:{x:left+i/c.days*width,y:top-height+s.timeline[i].mean/max*height},end:{x:left+d.day/c.days*width,y:top-height+d.mean/max*height},color:colors[index],thickness:1.5}) }))
  y = top-height-18; text('Verde: dirigido | Naranja: azar | Rojo: no intervenir',10)
  text('Días 0 a ' + c.days + '; altura máxima de escala: ' + n(max) + ' infectados. Líneas: promedios.',9)
  heading('Método y límites')
  text('La regla dirigida se busca entre una familia de candidatas usando futuros de calibración separados de los evaluados. Se comparan las tres alternativas con números aleatorios comunes. Es una búsqueda acotada, no un óptimo global.',10)
  text('La ciudad, grupos y tasas son sintéticos. No hay calibración clínica, fallecimientos ni predicción sanitaria real de Manta. El mapa animado muestra una corrida individual; este informe resume todas las corridas. Los halos no localizan casos por calle.',10)
  text('Para repetir: abrir la aplicación, aplicar estos parámetros y la misma semilla, y ejecutar. Guardar el JSON junto al PDF para conservar el detalle del experimento.',10)
  heading('Infraestructura y entrega')
  text('AWS Amplify sirve la aplicación; los cálculos y este PDF se generan en el navegador. Este informe complementa el pitch, no lo reemplaza.',10)
  footer(2)
  pdf.setTitle('7DaysToSurvive - Informe para el alcalde - semilla ' + c.seed)
  return pdf.save()
}
