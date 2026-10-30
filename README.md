# 7DaysToSurvive

Herramienta de apoyo a decisiones que simula una plaga estocástica sobre una red sintética de lugares de Manta y compara una asignación dirigida de vacunas con dos líneas base: no intervenir y repartir al azar exactamente los mismos recursos disponibles.

## Estado del proyecto

- Modelo SEIR estocástico ejecutado día a día sobre hogares, colegio, mercado, bus y barrio.
- Semilla real y 120 repeticiones Monte Carlo por defecto, con media y rango percentil 10–90.
- Interfaz para el Brote Sorpresa: origen, contagiosidad, vacunas, eficacia, inicio y semilla.
- Comparación justa entre 7DaysToSurvive, reparto aleatorio y no intervenir.
- Worker con progreso y cancelación, seis escenarios, exportación JSON, enlace compartible e informe imprimible.
- Diferencias pareadas firmadas, tres bandas P10–P90 y consumos reales visibles, incluidos escenarios donde la dirigida pierde.
- Pruebas de reproducibilidad, conservación, elegibilidad, recursos equivalentes y casos negativos.
- Despliegue estático en AWS Amplify Hosting; configuración de build versionada.

## Ejecución local

Requisitos: Node.js 22 y npm.

```bash
npm ci
npm run dev
```

Validación completa:

```bash
npm test
npm run build
```

## Despliegue en AWS

Demo pública: **https://main.d3kt9g5gofzhxh.amplifyapp.com/**

AWS Amplify Hosting, región **Ohio (`us-east-2`)**, rama **`main`**.
El archivo [amplify.yml](amplify.yml) instala Node 22 y dependencias con `npm ci`, ejecuta `npm test` y `npm run build`, y publica `dist`.
La aplicación actual no requiere variables de entorno, claves AWS, API ni base de datos.

[Diagrama de arquitectura SVG](docs/arquitectura.svg) · [Operación del equipo](docs/infraestructura.md) · [Costos](docs/costos.md)

![Arquitectura desplegada](docs/arquitectura.svg)

AWS Budget `spookython-2026-mensual` creado con 5 USD/mes y alertas reales a 1, 4 y 5 USD. Las capturas recortadas documentan el presupuesto y sus umbrales sin exponer datos personales. **El correo seguía pendiente de verificación el 30/10/2026**; debe verificarse para recibir los avisos. El Budget avisa, pero no detiene servicios ni constituye un límite duro de gasto.

![AWS Budget de 5 USD](docs/budget.jpg)

![Umbrales configurados en AWS Budget](docs/budget-alertas.jpg)

El stack S3/CloudFront y el script PowerShell del repositorio son una alternativa histórica; no se utilizan para este despliegue de Amplify.

## Supuestos del modelo

- Población cerrada durante el horizonte simulado.
- Red sintética agregada en cinco tipos de lugar: hogares, colegio, mercado, bus y barrio. No representa personas reales.
- Grupos excluyentes S/E/I/R/V: S sano (susceptible), E mordido (expuesto, aún no infeccioso), I zombie (infeccioso), R exorcizado (recuperado) y V protegido por vacuna. La suma de los cinco conserva la población.
- La contagiosidad combina 74 % de exposición dentro del lugar y 26 % entre lugares conectados.
- Una dosis solo se ofrece a susceptibles. Un fallo consume recurso y conserva S; puede haber otro intento en un día posterior. Se supone protección inmediata y observación perfecta del estado.
- La estrategia dirigida pondera susceptibles, prevalencia y conectividad. La línea aleatoria recibe el mismo inventario y calendario.
- Eventos pseudoaleatorios con claves de semilla/corrida/día/lugar/tipo, comunes entre estrategias; el reparto usa un flujo separado.
- No se modelan nacimientos, fallecimientos, reinfección ni pérdida de inmunidad en esta fase.

### Escenario predeterminado reproducible

| Parámetro | Valor | Origen |
|---|---:|---|
| Población | 15.000 | Subpoblación sintética elegida para la demostración; no es un dato censal |
| Infectados iniciales | 35 en el mercado | Escenario ficticio del reto |
| Horizonte | 90 días | Ventana operativa de la demostración |
| Contagiosidad | 0,34 | Supuesto del escenario ficticio, editable en vivo |
| Progresión expuesto → infeccioso | 0,22/día | Supuesto equivalente a aproximadamente 4,5 días |
| Recuperación | 0,16/día | Supuesto equivalente a aproximadamente 6,25 días |
| Vacunas | 180/día desde el día 6 | Restricción ficticia de recursos |
| Stock total | 15.120 dosis | Presupuesto 180×(90−6) implícito en la versión anterior, ahora editable y explícito |
| Eficacia | 82 % | Supuesto editable para la prueba de variante |
| Semilla | 2026 | Valor público para reproducir el resultado |
| Monte Carlo | 120 corridas | Balance entre estabilidad y respuesta inmediata en el navegador |

Para reproducir esta versión: pulsar **Restablecer escenario oficial**, confirmar semilla `2026` y pulsar **Ejecutar simulación**. Los controles editados no cambian resultados anteriores. Exportar JSON conserva configuración, resultado y versión `seir-places-2.0.0`; la duración queda fuera del resultado reproducible. La demo pública seguirá con su versión anterior hasta integrar y desplegar estos cambios.

Los números son parámetros educativos, no predicciones clínicas. La inspiración narrativa es COVID-19; sus tasas no calibran este modelo. [Método y fuentes](docs/modelo.md).

## Cómo funciona la estrategia

Cada día calcula un puntaje por lugar usando susceptibles, casos E/I y conectividad ficticia. Reparte proporcionalmente a ese puntaje. El azar muestrea uniformemente sin reemplazo entre susceptibles del día con el mismo stock, capacidad, inicio y eficacia. Los consumos realizados pueden diferir al agotarse la elegibilidad: se reportan explícitamente. No se promete igual número de dosis consumidas ni una estrategia óptima global.

La decisión utiliza resultados reales, incluidos negativos; la prioridad inicial proviene de las dosis asignadas, no del lugar donde empezó el brote. Los percentiles se interpolan linealmente y P10–P90 describe ejecuciones, no un intervalo de confianza de la media.

### Batería registrada

`node scripts/audit-scenarios.mjs` ejecuta 40 experimentos predefinidos con cinco semillas y 120 corridas cada uno. [Resultados completos](docs/evidencia/sensibilidad.json). La variante de algoritmo corrige el día de comienzo (día 0 sin acciones), el reparto al azar y la alineación de eventos. Cambian los números respecto a `07877a2`; se conservaron las tasas oficiales, sin ajustarlas para favorecer una victoria.

## Limitaciones conocidas

- La red es sintética y agregada; no reproduce calles, movilidad ni población real de Manta.
- La aproximación binomial para grupos grandes prioriza velocidad de la demo.
- No existe calibración epidemiológica ni validación clínica.
- El cálculo corre en el navegador; no se ejecutan todavía miles de corridas distribuidas en AWS.

## Estructura

```text
src/
  components/       interfaz reutilizable
  domain/           modelo y pruebas
docs/               arquitectura, costos y supuestos
infra/              infraestructura AWS
scripts/            automatización operativa
.github/workflows/  integración continua
```

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Estimación de costos](docs/costos.md)
- [Plan de implementación para la prueba de fuego](docs/plan-ganar.md)
- [Modelo, parámetros y evidencia](docs/modelo.md)
- [Recorrido de cinco minutos y respuestas](docs/demo.md)
- [Presentación del pitch](docs/presentacion.html) — abrir en navegador, imprimir a PDF para entrega

## Equipo

Proyecto desarrollado para SpookyThon 2026 · Track B: La Plaga Zombie.

## Licencia

MIT
