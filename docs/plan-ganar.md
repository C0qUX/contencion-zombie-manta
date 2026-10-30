# Plan de implementación para la prueba de fuego

Auditoría realizada el 30 de octubre de 2026 contra los requisitos oficiales del Track B.

## Diagnóstico actual

| Criterio | Estado | Evidencia o problema |
|---|---|---|
| Simulación día a día | Parcial | Existe un SIR determinista agregado, sin red de contactos ni lugares de Manta. |
| Intervención limitada | Parcial | Hay vacunas por día, pero no eficacia, stock, costo ni calendario de entregas. |
| Dos líneas base | No cumple | No intervenir existe. La línea llamada aleatoria no es aleatoria y usa 65 % de los recursos. |
| Repeticiones, promedios y rangos | No cumple | Solo se ejecuta una trayectoria determinista. |
| Parámetros interactivos | Parcial | Hay controles básicos; faltan semilla editable, variante, eficacia, origen y presupuesto. |
| Reproducibilidad por semilla | No cumple | La semilla aparece en pantalla, pero el motor no la utiliza. |
| Estrategia que optimiza | No cumple | La interfaz evalúa la configuración elegida; no busca ni recomienda la mejor asignación. |
| AWS | Cumple | Amplify Hosting público en `us-east-2`, con CI y Budget documentados. |
| Supuestos y fuentes | Parcial | Hay supuestos, pero los números epidemiológicos no tienen fuentes o justificación visible. |
| Prueba Brote Sorpresa | Riesgo alto | No se puede cambiar origen, eficacia parcial, recursos por día ni comparar incertidumbre. |

## P0: obligatorio antes del pitch

1. **Rehacer el motor como simulación estocástica reproducible.** Implementar un generador pseudoaleatorio con semilla y usarlo en contagios, recuperaciones y selección de personas.
2. **Representar una población de Manta.** Crear una red sintética explicable con hogares, colegios, buses, mercados y barrios. Mantener un modo rápido para el navegador.
3. **Corregir las líneas base.** Comparar: no intervenir; intervención aleatoria con exactamente el mismo stock, fechas y eficacia; estrategia propuesta.
4. **Ejecutar Monte Carlo.** Correr por defecto 100–300 repeticiones, informar media, mediana y rango percentil 10–90. Permitir cambiar el número de corridas.
5. **Construir una estrategia real.** Priorizar nodos/lugares por riesgo esperado (grado, centralidad y casos cercanos) y escoger la asignación que minimice contagios dentro del presupuesto.
6. **Hacer editable la semilla.** Mostrarla en la URL o permitir copiar la configuración para que el jurado repita exactamente el resultado.
7. **Preparar el Brote Sorpresa.** Añadir controles para contagiosidad, vacunas disponibles, eficacia de vacuna, lugar inicial y día de intervención.
8. **Mostrar las tres comparaciones.** Gráfica y tabla con estrategia, aleatoria y no intervenir; recursos usados deben quedar visibles.
9. **Documentar valores por defecto.** README con escenario, semilla, fuente o justificación de cada número y pasos exactos para reproducir la demo.
10. **Agregar pruebas que impidan una demo falsa.** Misma semilla = mismo resultado; semilla distinta puede variar; conservación de población; nadie vacunado si ya está infectado/inmune; igualdad de recursos entre estrategia y azar; estrategia supera baselines en un conjunto de semillas, no solo en una.

## P1: puntos que pueden ganar la competencia

### Producto y frontend

- Crear un selector de escenarios: dengue en Manta, variante más contagiosa, escasez de vacunas y brote en mercado/colegio.
- Añadir un mapa esquemático animado por barrios y lugares; colores Sano, Expuesto, Infeccioso y Recuperado/Inmune.
- Incluir una tarjeta **Decisión para el alcalde**: qué hacer hoy, dónde, cuántos recursos, costo e impacto esperado con intervalo.
- Mostrar un panel de rigor: repeticiones, semilla, supuestos, recursos idénticos y tiempo de ejecución.
- Añadir estados de carga y progreso durante Monte Carlo, mensajes para combinaciones inválidas y diseño móvil.
- Permitir exportar un informe imprimible o JSON de la configuración y resultados.

### Motor y dominio

- Pasar de SIR a SEIR para distinguir exposición/incubación, si el equipo puede explicarlo con seguridad.
- Modelar eficacia de vacuna, capacidad diaria, entregas de stock y costo por intervención.
- Combinar dos intervenciones: vacunación/fumigación dirigida y cierre temporal de un lugar de alto riesgo.
- Incorporar hospital saturado o límite operativo como métrica secundaria, solo si queda tiempo.
- Validar sensibilidad: mostrar qué parámetros cambian más la recomendación.

### Backend y AWS

- Mantener el cálculo básico en el navegador para que la demo nunca dependa del backend.
- Usar Web Workers para paralelizar Monte Carlo en la versión inmediata.
- Si el tiempo y créditos lo permiten, agregar una ejecución opcional en AWS Lambda con lotes y almacenar resultados resumidos en S3. No bloquear la demo si falla.
- Añadir CloudWatch solo para logs/errores del servicio opcional; evitar WAF, base de datos y servicios costosos que no aporten a la rúbrica.
- Versionar cualquier infraestructura nueva con SAM/CDK/Terraform y mínimo privilegio.

### Rigor y documentación

- Elegir una enfermedad inspiradora concreta y citar fuentes públicas de parámetros; distinguir datos reales, supuestos y valores lúdicos.
- Explicar por qué la población sintética representa Manta y qué limitaciones tiene.
- Registrar costo estimado y real después de cada servicio añadido.
- Preparar un guion de 5 minutos y respuestas sobre modelo, azar, recursos, AWS, seguridad y costos.
- Crear la presentación PDF/PPTX y ensayar el cambio de escenario en menos de 5 minutos.

## P2: solo si P0 y P1 están estables

- Miles de corridas en AWS con Step Functions Distributed Map o AWS Batch.
- Calibración automática contra una serie histórica.
- Informe generado con un modelo de lenguaje.
- Persistencia de escenarios compartidos y panel histórico.

## Quitar o corregir

- Quitar el nombre `randomIntervention` de la implementación actual hasta que exista azar real y recursos equivalentes.
- Quitar la afirmación “misma semilla, mismo resultado” mientras la semilla no gobierne el motor.
- Archivar o eliminar `infra/template.yaml` y `scripts/deploy-aws.ps1` si no se usará S3/CloudFront; hoy contradicen Amplify.
- Evitar afirmar que se “encuentra la mejor estrategia” hasta implementar y medir una búsqueda/optimización.
- Unificar `7DaysToSurvive`, `MantaZero` y el nombre presentado al jurado.
- Fijar versiones de dependencias en `package.json`; no dejar `latest`.
- No agregar autenticación, base de datos, Bedrock o microservicios solo para decir que se usó AWS.

## Orden recomendado para tres integrantes

1. **Motor y rigor:** PRNG con semilla, red sintética, baselines justas, Monte Carlo, optimizador y pruebas.
2. **Producto y visualización:** controles de sorpresa, tres curvas, rangos, mapa y recomendación para el alcalde.
3. **Integración y pitch:** Workers/AWS opcional, documentación, fuentes, costos, QA, presentación y ensayo.

Cada cambio entra por una rama corta, con `npm test` y `npm run build` antes de integrar. La rama `main` debe permanecer siempre desplegable.
