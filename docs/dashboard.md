# Dashboard para presentación pública

El recorrido comienza en la decisión: dónde intervenir, desde qué día y con cuántas dosis. Después muestra el impacto medio con P10–P90, el mapa diario, las curvas comparativas y la tabla de recursos. La navegación lleva a resumen, mapa, comparación y método.

La configuración mantiene origen, casos iniciales, contagiosidad, recursos, eficacia, inicio, semilla y repeticiones a la vista. Población, horizonte, costos y tasas de progresión/recuperación se abren en Más parámetros del escenario. Si una validación señala uno de esos campos, el grupo se abre para mostrarlo. En móvil se muestran primero los resultados y Ajustar escenario lleva a los controles.

Los costos y el mecanismo de selección se consultan en Por qué se recomienda. Los parámetros aplicados se separan de la configuración editada y se conservan en el informe impreso. Una derrota o empate sigue siendo visible en el titular y en los indicadores; la presentación no cambia los resultados para recomendar siempre la dirigida.

Se conservaron el algoritmo seir-places-3.0.0, sus parámetros, los Workers, los cambios del compañero y todas las pruebas. El rediseño no añade servicios, dependencias ni afirmaciones de validación clínica. Su posicionamiento es una herramienta educativa de comparación y apoyo a decisiones en escenarios sintéticos.

Validación: Node 22.23.4, 75 pruebas y build; aceptación general en navegador (incluye jerarquía, desplegables, teclado, pérdidas, exportación e impresión) y las ocho comprobaciones del mapa. La cartografía se intercepta en QA automatizado, por lo que las capturas de prueba muestran el esquema de respaldo. Revisar calles con conexión antes de una presentación.

El dashboard está preparado para revisión en la rama del mapa. Después de integrar en main, verificar Amplify y ejecutar nuevamente scripts/verify-ui.cjs contra la URL pública.

La siguiente revisión visual adopta una base blanca, rojo para avance del brote y verde para protección. Usa títulos y ayuda sencillos para explicar recursos, resultados y semillas a una audiencia no técnica. Conserva en secciones desplegables las tasas, el método y la evidencia que necesita el jurado. El mapa muestra halos de riesgo derivados de los cinco grupos sintéticos; la cartografía de fondo puede mostrar calles reales de OpenStreetMap cuando esté disponible.
