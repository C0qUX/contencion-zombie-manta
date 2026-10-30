# Demo de cinco minutos y respuestas

1. **0:00–0:40** — Manta ficticia, recursos limitados y tres respuestas. Señalar datos y parámetros como sintéticos.
2. **0:40–1:30** — Escenario oficial, semilla 2026 y 120 corridas. Leer diferencias frente a ambas referencias y sus rangos.
3. **1:30–2:15** — Tabla: stock/capacidad iguales, consumo real visible y no necesariamente idéntico. Explicar diferencias pareadas.
4. **2:15–3:20** — Brote sorpresa: contagio ×2 o mitad de stock; pulsar Ejecutar. Los resultados anteriores conservan su configuración. Mostrar progreso/cancelación.
5. **3:20–4:10** — Decisión y reparto inicial por lugar, corrida 1, exportación JSON y enlace reproducible.
6. **4:10–5:00** — Amplify sirve por HTTPS; el dispositivo calcula. Budget alerta, no corta gasto. Limitaciones y ausencia de calibración.

## Respuestas breves

- **¿Por qué SEIR?** Separa latencia e infecciosidad. E no equivale a incubación clínica ni reproduce toda la biología del COVID-19.
- **¿Por qué Monte Carlo?** Una trayectoria puede ser afortunada. Evaluamos muchas y reportamos variabilidad empírica.
- **¿Por qué esa semilla?** Pública y reproducible. Hay batería con cinco semillas y pérdidas preservadas.
- **¿Comparación justa?** Mismo stock, capacidad, inicio, eficacia, horizonte y estado inicial; azar por eventos comunes. Consumo real visible porque elegibilidad puede cambiar.
- **¿Óptimo?** No. Heurística por susceptibles, prevalencia y conectividad ficticia.
- **¿AWS?** Amplify instala, prueba, compila y sirve; Monte Carlo corre en el navegador.
- **¿Costo?** Ver supuestos y fechas en docs/costos.md; no prometer factura final cero ni que Budget detenga servicios.
- **¿Si pierde?** Mostramos diferencia negativa y una decisión condicionada. No se cambia la semilla para aparentar éxito.

Ensayar en la URL final antes de presentar. Las evidencias locales no prueban AWS; no cambiar v0.1.0 sin comprobar las reglas.
