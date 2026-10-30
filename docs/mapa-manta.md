# Mapa de Manta y prueba de contención

## Qué muestra

El mapa reproduce el historial de los cinco grupos agregados de la corrida 0 para dirigida, azar y ninguna intervención. Se puede seleccionar día y estrategia, reproducir, pausar y reiniciar. Los anillos muestran proporciones S/E/I/R/V y el porcentaje central representa infecciosos. La tabla muestra los conteos exactos del día seleccionado y las dosis acumuladas.

La cartografía de calles de OpenStreetMap se activa automáticamente al entrar el mapa en pantalla. No requiere API keys. Se puede arrastrar, acercar y alejar entre zoom 12 y 16, volver a centrar Manta y seleccionar grupos desde el mapa o sus botones. Se cargan únicamente las teselas del encuadre actual; no hay descarga de mapas para uso offline, precarga de zoom ni sondeo constante. Se conserva la caché normal del navegador y el Referer. La atribución queda visible sobre la cartografía. Política: https://operations.osmfoundation.org/policies/tiles/.

La reproducción comienza automáticamente al mostrar el mapa, se suspende fuera de pantalla y termina al alcanzar el horizonte completo. Pausa, velocidad y día siguen siendo manuales; con movimiento reducido no hay reproducción automática. El marcador del día informa nuevas exposiciones y si ya comenzó la intervención. Las líneas animadas ilustran mezcla sintética entre grupos: no son desplazamientos detectados por las calles.

Si falla el proveedor o no se activa, permanece un fondo esquemático. El motor, la animación, la tabla y la batería funcionan sin el servicio cartográfico. La animación cambia datos locales, no vuelve a descargar calles por día. Las pruebas automatizadas interceptan esas solicitudes para evitar tráfico de bots al proveedor.

## Geografía y límites

El encuadre está centrado aproximadamente en Manta (latitud −0,973, longitud −80,722), zoom 13 y proyección Web Mercator. Las cinco anclas son ubicaciones de visualización ficticias, no coordenadas de colegios, mercados, terminales ni domicilios reales.

Las calles no convierten al modelo en una simulación geográfica calibrada: la transmisión sigue siendo entre cinco grupos agregados con conectividad sintética. No modela rutas reales, movilidad, toda la población censal ni personas pertenecientes a varios lugares. La subpoblación y las tasas siguen siendo supuestos del escenario.

## Historial sin cambiar el modelo

RunResult añade zonesTimeline y dosesTimeline opcionales. simulateOnce mantiene sus cuatro argumentos previos y añade un quinto keepMapHistory=false. compareStrategies solicita mapas solamente para la corrida 0 de las tres estrategias ilustradas, nunca para toda la calibración o Monte Carlo.

Los snapshots son copias, incluyen día 0 sin acciones y llegan hasta days. Registrar historial no consume azar ni cambia métricas, políticas, tasas ni semillas. Se conserva la versión epidemiológica seir-places-3.0.0 porque esta ampliación solo añade observación. Si llega un resultado anterior sin historial, la interfaz informa y muestra el final; no interpola trayectorias inventadas.

## Prueba con cinco semillas

El botón Evaluar cinco semillas ejecuta Workers secuenciales con la misma configuración aplicada y cinco semillas distintas elegidas antes de correr. La semilla del usuario aparece primero; se completa la lista desde 2026, 42, 12345, 98765 y 314159. Cada semilla conserva su selección de política en futuros de calibración separados de las corridas evaluadas.

Se informa cuántas semillas reducen contagios medios frente a ambas referencias. Se conservan diferencias negativas y empates, con P10–P90 pareado frente al azar. La cancelación deja solamente las filas completadas, etiquetadas como resultado parcial. El JSON exporta configuración, versión, semillas solicitadas y filas completadas. No usa los resultados de la batería para volver a elegir una política ni filtra semillas perdedoras.

Este criterio es evidencia de un escenario, no una prueba universal ni validación clínica. El modelo no calcula fallecimientos: contagios evitados o protección vacunal no equivalen a vidas salvadas.

## Validación

Resultado registrado desde el Worker del navegador con 120 corridas por semilla: las cinco semillas completadas mejoraron ambas referencias en media. Frente al azar, las diferencias fueron 451,5 (2026), 453,3 (42), 447,9 (12345), 469,7 (98765) y 437,7 (314159). Evidencia completa: [mapa-semillas.json](evidencia/mapa-semillas.json). No implica superioridad fuera de ese escenario.

La versión anterior pasó 70 pruebas y build con Node 22.23.4, las 11 comprobaciones de regresión de interfaz y seis comprobaciones de mapa/batería. La ampliación automática e integración de costos pasa 75 pruebas y build. El script scripts/verify-map.cjs comprueba la reproducción automática, navegación, fallback y batería. Se interceptan las peticiones de teselas durante automatización; la disponibilidad real del proveedor depende de la conexión y no se presenta como garantizada.

- Pruebas de historial: conservación de totales por día, última imagen igual al estado final, dosis iniciales cero, snapshots sin alias y reproducción sin cambiar métricas.
- Pruebas de proyección: anclas dentro del encuadre y número acotado de teselas.
- Edge: día 0/final, cambio de estrategia, reproducción/pausa, movimiento reducido, fallo de cartografía, batería reproducible, descarga JSON y móvil de 390 px.
- Regresión: ejecutar el script existente scripts/verify-ui.cjs contra el build servido.

El mapa se desarrolló sobre mejora/cierre-reto y main 2e94420, incluido el PDF. Se integró también mejora/p1-mapa-costos en c18c949, conservando costos por dosis, validaciones y ensayo del Brote Sorpresa del compañero. Se unificó el historial como zonesTimeline y dosesTimeline, evitando mantener dos mapas o snapshots duplicados. El PR apunta a main; no se despliega automáticamente hasta integrarlo y no modifica AWS ni la release entregada.
