# Demo de cinco minutos y respuestas — Pitch ULEAM 30 de octubre

## Guion del pitch (5 min)

### 0:00–0:40 — El problema
- Manta ficticia, un brote empieza con un caso. Cada mordido contagia a quienes tiene cerca.
- No hay vacunas para todos. No se puede cerrar toda la ciudad.
- Las autoridades necesitan decidir: a quién vacunar primero, dónde, cuándo.
- Señalar datos y parámetros como sintéticos, no datos reales de Manta.

### 0:40–1:30 — El modelo y la solución
- SEIR: S sano, E mordido (expuesto), I zombie (infeccioso), R exorcizado (recuperado), V protegido.
- Red de 5 lugares: hogares, colegio, mercado, bus, barrio.
- Escenario oficial, semilla 2026, 120 corridas Monte Carlo.
- Tres estrategias con igual presupuesto: 7DaysToSurvive (dirigida), azar y no intervenir.
- La dirigida elige su regla entre 32 en 24 futuros de calibración y se evalúa en 120 futuros distintos.
- Leer diferencias frente a ambas referencias y sus rangos P10–P90.

### 1:30–2:15 — Comparación justa
- Tabla: stock/capacidad iguales, consumo real visible y no necesariamente idéntico.
- Explicar diferencias pareadas: cada corrida se compara consigo misma.
- P10–P90 es variabilidad entre corridas, NO intervalo de confianza.
- Si la dirigida pierde, lo mostramos honestamente.

### 2:15–3:20 — Brote Sorpresa
- Cambiar condiciones en vivo: contagio ×2, mitad del stock, cambio de origen.
- Pulsar Ejecutar. Los resultados anteriores conservan su configuración.
- Mostrar progreso del Worker, cancelación si hace falta.
- Leer la nueva decisión y los recursos comparados.

### 3:20–4:10 — Decisión y detalles
- Decisión para Manta: qué política obtiene menor media.
- Regla elegida y ganancia frente a la regla fija original; desplegar las 32 reglas evaluadas.
- Costo del plan y costo por contagio evitado (supuesto editable de 10 USD por dosis).
- Reparto inicial por lugar, corrida 1 de N como ejemplo individual.
- Exportación JSON con versión del algoritmo.
- Enlace reproducible con la configuración.

### 4:10–5:00 — Arquitectura y cierre
- Amplify sirve por HTTPS desde Ohio; el dispositivo calcula.
- Budget: 5 USD mensuales, alertas a 1, 4 y 5 USD. No corta gasto.
- Costo estimado: ~2.76 USD/mes.
- Limitaciones: datos sintéticos, sin calibración clínica, mejor regla de una familia acotada y no óptimo global.
- "Decidir antes de que el brote decida."

## Respuestas breves para preguntas del jurado

- **¿Por qué SEIR?** Separa latencia e infecciosidad. E no equivale a incubación clínica ni reproduce toda la biología del COVID-19.
- **¿Por qué Monte Carlo?** Una trayectoria puede ser afortunada. Evaluamos 120 futuros y reportamos variabilidad empírica.
- **¿Por qué esa semilla?** Pública y reproducible. Hay batería con cinco semillas y pérdidas preservadas.
- **¿Comparación justa?** Mismo stock, capacidad, inicio, eficacia, horizonte y estado inicial; azar por eventos comunes. Consumo real visible porque elegibilidad puede cambiar.
- **¿Óptimo?** Mejor de una familia acotada: 32 reglas probadas en 24 futuros de calibración. En el escenario oficial evita 451,5 contagios frente al azar (la regla fija evitaba 134,7) y 316,8 más que esa regla fija. No prometemos óptimo global.
- **¿No hacen trampa al elegir la regla?** Se elige en futuros de calibración que nunca entran en los 120 evaluados. El azar y no intervenir dan exactamente los mismos resultados que antes.
- **¿AWS?** Amplify instala, prueba, compila y sirve. Monte Carlo corre en Web Worker del navegador.
- **¿Costo?** Ver supuestos y fechas en docs/costos.md; no prometer factura final cero ni que Budget detenga servicios.
- **¿Si pierde?** Mostramos diferencia negativa y una decisión condicionada. No se cambia la semilla para aparentar éxito.
- **¿Cuánto cuesta el plan?** Con el supuesto ficticio de 10 USD por dosis, la dirigida gasta 150.094 USD: 15,40 USD por contagio evitado frente a no intervenir. El azar gasta 146.386 USD y paga 15,74 USD por contagio evitado. El costo por dosis se puede cambiar en vivo.
- **¿Qué estados usan?** S sano (susceptible), E mordido (expuesto), I zombie (infeccioso), R exorcizado (recuperado), V vacunado.
- **¿Por qué no datos reales?** No se nos entregaron datos. El reto dice que cada equipo diseña su escenario. Nuestra red es sintética y lo declaramos.
- **¿Cuántas corridas necesitan?** 120 dan percentiles estables. Con menos de 30 el sistema advierte que los percentiles son inestables.

## Preparación del Brote Sorpresa

Ensayar antes del pitch con al menos estas variaciones:

Ensayo real sobre la URL pública con `seir-places-3.0.0`, semilla 2026 y 120 corridas, el 30/10/2026 a las 16:15 UTC, pulsando los mismos controles ([evidencia](evidencia/aws/ensayo-brote-sorpresa.json)). Todas las reglas elegidas usan casos activos ×12:

| Variación | Cómo aplicarla | Evitados frente al azar (P10–P90) | Frente a no intervenir | Frente a la regla fija | Regla elegida | Cálculo |
|---|---|---:|---:|---:|---|---:|
| Oficial | Restablecer escenario oficial → Ejecutar | 451,5 (326,6 a 595,6) | 9.749,2 | 316,8 | Concentrar, propagación^2 | 2,4 s |
| Contagio ×2 | Botón "Contagio ×2" → Ejecutar | 228,7 (164,7 a 296,0) | 5.752,9 | 178,0 | Concentrar, propagación^2, conectividad | 1,6 s |
| Mitad del stock | Botón "Mitad del stock" → Ejecutar | 517,1 (353,8 a 661,5) | 8.803,5 | 348,8 | Concentrar, propagación^2 | 2 s |
| Brote en colegio | Origen del brote → Colegio → Ejecutar | 355,7 (224,2 a 494,3) | 9.883,2 | 260,8 | Concentrar, propagación^1 | 2,5 s |
| Brote en bus | Origen del brote → Bus → Ejecutar | 494,6 (352,6 a 651,4) | 9.603,9 | 343,1 | Concentrar, propagación^2 | 2 s |
| Eficacia 0,5 | Eficacia → 0.5 → Ejecutar | 520,9 (357,4 a 696,3) | 7.243,5 | 385,1 | Concentrar, propagación^2 | 1,5 s |
| Intervención día 25 | Día de intervención → 25 → Ejecutar | 196,8 (124,0 a 289,1) | 6.539,1 | 143,8 | Concentrar, propagación^2 | 1,2 s |
| Contagio ×2 + mitad del stock | Ambos botones → Ejecutar | 227,1 (163,8 a 296,0) | 5.751,3 | 176,4 | Concentrar, propagación^2, conectividad | 1,2 s |

En las ocho variaciones la dirigida gana al azar en todas las corridas: el mínimo pareado fue positivo, entre +24 (colegio) y +204 (eficacia 0,5). Con contagio ×2 la regla elegida cambia y añade conectividad; con brote en colegio baja la propagación a ^1. Es la búsqueda adaptándose al brote sorpresa.

Si la dirigida pierde: explicar honestamente que es la mejor regla de una familia acotada, no un óptimo, y que la derrota se mide en futuros nuevos.

Ensayar en la URL final antes de presentar. Las evidencias locales no prueban AWS; no cambiar v0.1.0 sin comprobar las reglas.
