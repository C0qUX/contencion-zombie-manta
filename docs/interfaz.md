# Entrega de interfaz: 7DaysToSurvive

La sala de mando utiliza el motor real del commit `fbe5afb` mediante un Web Worker de módulo. No utiliza fixtures para producir resultados. No añade dependencias ni modifica el contrato, el motor, el lockfile o la configuración de AWS.

## Archivos

- `src/App.tsx`: ciclo de ejecución, configuración editable/aplicada, errores y cancelación.
- `src/components/ScenarioControls.tsx`: formulario numérico, validación visible y sorpresas acumulativas.
- `src/components/CurveChart.tsx`: tres curvas medias, bandas P10–P90 y tabla diaria accesible.
- `src/components/ExperimentResults.tsx`: comparación, diferencias pareadas, recomendación y exportación JSON.
- `src/components/ContactNetwork.tsx`: repetición 0, posiciones estables, estados con formas diferentes y reproducción manual.
- `src/features/simulation/`: validación, sorpresas, presentación y cliente del Worker con pruebas.
- `src/workers/simulation.worker.ts`: integración directa con `runExperiment` y protocolo compartido.
- `src/dev/verify-control-room.cjs`: comprobación opcional en navegador usando una instalación externa de Playwright.
- `src/styles.css`: adaptación de la estética existente y vistas estrechas.
- `docs/evidencia-ui/`: capturas y registro de aceptación.

## Integración

Rama: `codex/control-room-ui`, creada sobre `codex/sirv-graph-engine` (`fbe5afb`). Depende del motor y contrato de la PR #1. El coordinador debe integrar primero esa PR y después esta interfaz; no se ha hecho merge ni despliegue.

Para revisar localmente desde esta rama:

```powershell
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Abrir `http://127.0.0.1:4173`. También funciona con `npm run dev`. El Worker de producción se emite como archivo independiente en `dist/assets/`.

Para repetir la aceptación automatizada, usar una instalación existente de Playwright, sin añadirla a las dependencias del producto:

```powershell
# Omitir PLAYWRIGHT_MODULE si Playwright ya se resuelve en el entorno de pruebas.
$env:PLAYWRIGHT_MODULE = 'RUTA_A_LA_INSTALACION_EXISTENTE_DE_PLAYWRIGHT'
$env:UI_BROWSER_CHANNEL = 'msedge'
node src/dev/verify-control-room.cjs
```

`UI_BASE_URL` permite elegir otra URL local. Si no se indica canal, Playwright usa su Chromium instalado. `UI_EVIDENCE_DIR` permite guardar evidencias fuera del repositorio.

## Validación local

- `npm test`: 70 pruebas, incluidos seis casos nuevos de interfaz/cliente.
- `npm run build`: TypeScript y Vite; Worker independiente.
- Navegador: Edge, build servido mediante `npm run preview`, escritorio 1440 × 1000 y móvil 390 × 844, preferencia de movimiento reducido.
- Diez comprobaciones de aceptación: escenario inicial, progreso, tres curvas/bandas, semilla 87 repetida con igualdad del resultado completo, configuración pendiente sin recalcular, controles de red y pausa, cuatro sorpresas, restablecimiento, stock cero, entradas inválidas, error real del motor, cancelación durante cálculo pesado, reejecución, descarga JSON y teclado.
- Se comprueba una diferencia negativa real con población 50, 30 días, semilla 14, una repetición, stock 10 y dos dosis/día. Es un caso de prueba; los valores iniciales del producto permanecen en `DEFAULT_CONFIG`.
- Sin errores JavaScript en la ejecución de aceptación. La prueba de error altera una solicitud de prueba para exceder la capacidad del mercado; comprueba la respuesta real del motor y su presentación, sin fabricar resultados.
- Las pruebas locales se ejecutaron con Node.js 24.13.0. La configuración CI existente utiliza Node.js 22; su resultado se debe comprobar en la PR.

Evidencias: `docs/evidencia-ui/escritorio.png`, `docs/evidencia-ui/movil.png` y `docs/evidencia-ui/verificacion.json`. Son pruebas locales; no prueban funcionamiento en AWS.

## Demo de 90 segundos

1. **0–15 s:** presentar el escenario ficticio y los recursos. Mostrar semilla 2026 y 50 repeticiones en la sección de reproducibilidad. Ejecutar.
2. **15–35 s:** mostrar las tres curvas y las bandas. Explicar que representan infectados activos y variabilidad empírica. Leer las diferencias pareadas y la tabla de dosis utilizadas; no equivalen a vidas salvadas.
3. **35–50 s:** elegir una estrategia en la red y avanzar el día con el teclado. Reproducir y pausar. Señalar «Repetición 1 de 50: ejemplo individual» y que no es un mapa real.
4. **50–65 s:** pulsar Contagio ×2 y Mitad de antídotos. Leer el cambio exacto y el aviso de cambios pendientes; los resultados conservan la configuración anterior. Ejecutar de nuevo.
5. **65–80 s:** mostrar la recomendación y el rango. Si el resultado pierde o empata, explicarlo tal como aparece. No se busca ni se promete un óptimo.
6. **80–90 s:** exportar JSON y mostrar los supuestos: red sintética fija entre repeticiones, población ficticia y modelo simplificado.

## Límites y tareas del coordinador

- La posición de cada nodo es una distribución ilustrativa estable por uno de sus lugares de contacto; una persona puede participar en varios. Los cuatro grupos no representan barrios ni coordenadas.
- La animación empieza pausada. Los estados se distinguen por formas y texto, además de color. El SVG ofrece resumen y títulos por persona; la inspección detallada de cientos de nodos en pantallas pequeñas tiene resolución limitada.
- No se ha probado Safari ni Firefox. Poblaciones grandes pueden producir una red visualmente densa.
- La validación UI respeta los límites de producto y utiliza el generador real para comprobar capacidad de la zona antes de ejecutar. El motor existente permite límites más amplios en su API directa para las pruebas pequeñas; el responsable del motor debe revisar la separación entre helpers internos y límites públicos. Esta entrega no modifica `src/domain/`.
- La aplicación establece el título visible del navegador desde React. El coordinador posee `index.html`: debe actualizar su título estático `MantaZero` y revisar los metadatos junto con el nombre final.
- README, configuración de Node, branding raíz y AWS siguen siendo áreas del coordinador. Verificar la URL desplegada, CI de Node 22 y el canal/plazo de entrega por separado.
