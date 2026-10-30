# Auditoría y preparación de demo — 30 de octubre de 2026

## Base comprobada

Base: origin/main en 07877a2. La copia de esta sesión estaba en una revisión anterior con cambios locales; se guardaron íntegramente en un stash identificado antes de crear **mejora/demo-rigor**. No se mezcló el motor SIRV anterior por personas con el SEIR agregado actual.

La base pasó 12 pruebas y build con Node 22.23.4. La release v0.1.0 conserva el tag anterior 49b4e6b; su descripción apunta a la demo actual. Esta rama no modifica tag, release ni producción.

## Auditoría breve

| Área | Estado inicial | Cambio local |
|---|---|---|
| SEIR y semilla | Existían con 120 corridas | Conservados; versión del algoritmo explícita |
| Comparación | Igual presupuesto, consumo no necesariamente idéntico | Disponibilidad y consumo visibles; azar uniforme diario |
| Azar | Flujo secuencial se desalineaba; eficacia compartía flujo con selección | Claves por corrida/día/lugar/evento |
| Efectos negativos | Truncados a cero | Diferencias pareadas firmadas y percentiles |
| Recomendación | Dirigida siempre recomendada; origen afirmado como prioridad | Decisión condicionada y primera asignación observada |
| Ejecución | Monte Carlo síncrono durante render | Worker, progreso, cancelación, errores y resultado anterior |
| Validación | Acotación silenciosa; origen desbordaba hacia otros lugares | Rechazo explícito en dominio, formulario y URL |
| Banda | Solo dirigida; retorno cruzado del polígono | Tres bandas correctas y marcador de intervención |
| Comunicación | Protección llamada independiente aunque sumaba fuera de SEIR | Cinco grupos excluyentes y supuestos visibles |
| AWS | Hosting existente según documentación | Se conservó; sin infraestructura adicional |

## Validación de esta rama

- Node 22.23.4: pruebas y build de producción.
- 60 pruebas en cuatro archivos, incluidas las 12 originales.
- Worker independiente en dist/assets.
- Edge con build servido localmente: ejecución real, tres bandas/curvas, progreso, edición pendiente, semilla repetida, validación, presets/sorpresas, cero stock, cancelación/reintento, errores, JSON, URL, pérdidas, 390 px, teclado e impresión.
- 40 experimentos registrados en docs/evidencia/sensibilidad.json.
- Estas pruebas locales no sustituyen la verificación posterior de la URL AWS.

## Riesgos y pendientes

1. Pesos ficticios, observación perfecta y vacuna inmediata; sin calibración clínica.
2. Igual presupuesto no garantiza idéntico consumo; se informa expresamente.
3. La aproximación normal binomial puede introducir error en colas de grupos grandes.
4. Resultados nuevos por correcciones del algoritmo; guardar versión en exportaciones.
5. Coordinar la revisión con los otros integrantes: esta rama cambia dominio y frontend.
6. No se verificaron correo actual de Budget ni gasto final. No se cambiaron cuenta, región, plan o alertas.
7. Tras integrar, probar URL pública y registrar commit desplegado.
8. Confirmar con organización si puede publicarse nueva release o actualizar entrega.
9. Los PR #1 y #2 se cerraron sin integrar; proponían el motor SIRV anterior. No reincorporarlos sobre este SEIR.

## Siguiente bloque — Preparación para pitch del 30 de octubre

Presentación de cinco minutos en la ULEAM seguida de tres minutos de preguntas del jurado.

Rúbrica de la prueba de fuego (40 % de la nota total):
- Impacto de la estrategia: 30 %
- Rigor del modelo: 25 %
- Brote Sorpresa: 25 %
- Claridad para decidir: 20 %

Pendientes antes del pitch:
1. Ensayar el Brote Sorpresa con al menos tres variaciones (contagio ×2, mitad stock, cambio de origen).
2. Verificar que la demo pública responde en la URL: https://main.d3kt9g5gofzhxh.amplifyapp.com/
3. Comprobar con el titular el correo de Budget y el gasto actualizado.
4. Tener la presentación PDF/PPTX lista (docs/presentacion.html → imprimir a PDF).

Este documento sustituye el roadmap anterior, que mezclaba tareas ya completadas y propuestas. Método completo en docs/modelo.md y recorrido en docs/demo.md.

## Repetir la aceptación en navegador

Con una instalación externa de Playwright, sin añadir dependencias al producto, servir el build con **npm run preview -- --host 127.0.0.1 --port 4174 --strictPort** y ejecutar **node scripts/verify-ui.cjs**.

Variables opcionales: PLAYWRIGHT_MODULE (ruta a Playwright), UI_BROWSER_CHANNEL (por ejemplo msedge), UI_BASE_URL y UI_EVIDENCE_DIR. El script comprueba resultados reales del Worker, guarda capturas y un registro de aceptación. El test de errores corrompe únicamente una solicitud de prueba para comprobar la validación real del motor; no fabrica resultados de simulación.
