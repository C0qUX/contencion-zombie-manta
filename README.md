# 7DaysToSurvive

Herramienta de apoyo a decisiones que simula una plaga estocástica sobre una red sintética de lugares de Manta y compara una asignación dirigida de vacunas con dos líneas base: no intervenir y repartir al azar exactamente los mismos recursos disponibles.

## Estado del proyecto

- Modelo SEIR estocástico ejecutado día a día sobre hogares, colegio, mercado, bus y barrio.
- Semilla real y 120 repeticiones Monte Carlo por defecto, con media y rango percentil 10–90.
- Interfaz para el Brote Sorpresa: origen, contagiosidad, vacunas, eficacia, inicio y semilla.
- Comparación justa entre 7DaysToSurvive, reparto aleatorio y no intervenir.
- Pruebas de reproducibilidad, conservación, elegibilidad, recursos equivalentes y superioridad en el escenario documentado.
- Despliegue estático en AWS Amplify Hosting; configuración de build versionada.

## Ejecución local

Requisitos: Node.js 22 y npm.

```bash
npm install
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
- Estados SEIR: susceptible, expuesto, infeccioso y recuperado; vacunado se registra como protección independiente.
- La contagiosidad combina 74 % de exposición dentro del lugar y 26 % entre lugares conectados.
- Una dosis solo se ofrece a personas susceptibles. La eficacia decide qué fracción queda protegida; una dosis fallida consume recurso, pero no cambia el estado.
- La estrategia dirigida pondera susceptibles, prevalencia y conectividad. La línea aleatoria recibe el mismo inventario y calendario.
- Los contagios, progresiones, recuperaciones y eficacia se muestrean con un generador pseudoaleatorio gobernado por la semilla.
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
| Eficacia | 82 % | Supuesto editable para la prueba de variante |
| Semilla | 2026 | Valor público para reproducir el resultado |
| Monte Carlo | 120 corridas | Balance entre estabilidad y respuesta inmediata en el navegador |

Para reproducir: abrir la demo, pulsar **Restablecer escenario** y confirmar semilla `2026`. Los números son parámetros educativos, no predicciones clínicas. Antes de una decisión sanitaria deben calibrarse y validarse con datos oficiales.

## Cómo funciona la estrategia

Cada día calcula un puntaje por lugar usando susceptibles disponibles, casos expuestos/infecciosos y conectividad. Distribuye primero las dosis hacia mayor riesgo esperado. La línea aleatoria usa el mismo inventario diario y la misma fecha de inicio, pero reparte sin ese puntaje. La interfaz reporta promedios y percentiles para evitar presentar una trayectoria afortunada como evidencia.

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

## Equipo

Proyecto desarrollado para SpookyThon 2026 · Track B: La Plaga Zombie.

## Licencia

MIT
