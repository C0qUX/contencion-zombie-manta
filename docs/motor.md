# Motor de 7DaysToSurvive

La entrada pública del motor es `runExperiment` en `src/domain/experiment.ts`,
con la firma `RunExperiment` del contrato compartido completo en
`src/shared/simulation-contract.ts`. `trajectory.ts` y `paired.ts` conservan
representaciones internas compactas; la salida pública respeta `ExperimentResult`
y `DaySnapshot`, incluidos `cumulativeInfected` y `states`.

La interfaz del HEAD inicial sigue importando el prototipo agregado de
`src/domain/simulation.ts`. Ese archivo todavía no es la entrada del motor nuevo:
el rol de interfaz deberá migrar al contrato completo. Su prueba de superioridad
obligatoria se sustituyó por una comprobación de compatibilidad de las curvas;
las pruebas del nuevo motor no exigen que una estrategia gane siempre.

Simulación educativa de una población ficticia inspirada en espacios de contacto
de Manta. La red no es un mapa geográfico real; los parámetros no están calibrados
con datos sanitarios y los resultados no son recomendaciones clínicas.

## Modelo

Cada persona tiene ID contiguo y un único estado: susceptible (S), infectada (I),
recuperada (R) o inmunizada por vacuna (V). La población es cerrada. R y V son
inmunes durante todo el horizonte. No se modelan fallecimientos, exposición E,
nacimientos, reinfección ni pérdida de inmunidad. Vacunación e infección no
equivalen a vidas salvadas.

`transmissionProbability` es la probabilidad diaria de transmisión en cada
contacto entre I y S. `recoveryProbability` es la probabilidad diaria de
recuperación de cada I, no una duración. Son unidades distintas del beta agregado
del prototipo anterior. Cada parámetro de probabilidad admite de 0 a 1, incluidos
los extremos.

Día 0: solamente estados iniciales. En cada día 1..days:

1. Identificar las personas I al comenzar el día.
2. Vacunar si el día es mayor o igual a `interventionDay`.
3. Evaluar contagios desde aquellas I hacia quienes siguen S después de vacunar.
4. Evaluar recuperación de las I iniciales y aplicar las nuevas infecciones.
5. Guardar el estado al finalizar el día.

Una nueva I no transmite ni se recupera ese mismo día. V y R no reciben contagios.
La vacunación continúa tras extinguirse el brote si quedan días, stock y elegibles.
Si `interventionDay` es 0, la primera acción sigue siendo el día 1. Si es mayor
que el horizonte, no hay intervención.

## Red sintética estática

Se permutan los IDs con semilla y se forman hogares de hasta cuatro personas.
Sobre esa permutación se asignan pertenencias sintéticas a colegio, mercado y
transporte. En los últimos tres contextos se añaden anillos de contactos y hubs
por grupos de 16, 24 y 12, respectivamente. Se reservan contactos para asegurar
la presencia de los cuatro contextos incluso en la red mínima de cuatro personas.

Las conexiones son no dirigidas, sin bucles ni pares repetidos. Si un par ya tiene
contacto en un contexto, no se añade otro contacto para ese par en otro contexto.
Cada arista cuenta una sola vez para el grado total. Las pertenencias `zones`
expresan lugares de participación, no coordenadas ni una partición territorial.
La red es estática, incluso al recuperarse o vacunarse las personas.

`initialZone` filtra las pertenencias para seleccionar infectados iniciales sin
reemplazo. `random` incluye a todas las personas. Si faltan candidatos se devuelve
un error con la zona, el número disponible y el solicitado; no se rellena desde
otras zonas.

## Vacunación y comparación

- `none`: no aplica dosis.
- `random`: permutación Fisher–Yates de susceptibles sin intento previo; las
  primeras personas reciben los intentos disponibles. Toda la población elegible
  participa, sin preferencia por zona o grado.
- `targeted`: susceptibles sin intento previo por grado total descendente,
  desempatando por ID ascendente.

La lista elegible se reconstruye diariamente. Ambas estrategias de vacunación
usan los mismos `totalVaccines`, `vaccinesPerDay`, `interventionDay` y
`vaccineEfficacy`. No se aplica reducción adicional de la transmisión.

Cada intento consume una dosis. Un éxito cambia S a V; un fallo conserva S pero
impide nuevos intentos. I, R y V nunca reciben dosis. Se supone que el estado de
cada persona es observable y que se conoce si hubo intento previo: simplificaciones
fuertes que harían falta revisar para una intervención real. El consumo realizado
puede diferir entre estrategias al agotarse sus respectivos elegibles.

## Azar reproducible

El motor usa aritmética entera de 32 bits (`Math.imul`, XOR y desplazamientos sin
signo). Para cada clave se mezcla el acumulador con la clave y `0x9e3779b9`, luego
se aplican los multiplicadores `0x21f0aaad` y `0x735a2d97` con desplazamientos
16, 15 y 15. La salida sin signo dividida entre 2^32 da un valor en [0, 1).
Las etiquetas numéricas de `random.ts` separan las familias de eventos.

Los eventos de una repetición usan claves independientes del nombre de estrategia:

- Transmisión: semilla de repetición, etiqueta, día, extremo menor, extremo mayor,
  dirección (0 si transmite el extremo menor, 1 si transmite el mayor).
- Recuperación: semilla de repetición, etiqueta, día, ID.
- Eficacia: semilla de repetición, etiqueta, ID, independientemente del día.
- Selección aleatoria de vacuna: flujo con semilla derivada y contador propio.
- Infectados iniciales: flujo con semilla derivada y etiqueta propia.
- Red: flujo con semilla derivada de la semilla del experimento y etiqueta propia.

Los sorteos de selección no desplazan los sorteos de contagio, recuperación o
eficacia. Reordenar aristas tampoco altera esos eventos. Compartir sorteos hace
comparables las estrategias, pero no fuerza que sigan el mismo estado después de
intervenir, ni que una estrategia siempre mejore a otra.

Es un generador seudoaleatorio práctico, no criptográfico ni una prueba de
independencia estadística. El espacio de 32 bits permite colisiones; la reducción
de un valor de 32 bits a un índice Fisher–Yates puede introducir un sesgo discreto
ínfimo cuando el tamaño no divide 2^32. Las semillas válidas son enteros sin signo
de 32 bits. Cambiar el generador, la red o el orden diario exige una nueva versión
del algoritmo. No se usan reloj ni `Math.random()` para resultados del dominio.

`ALGORITHM_VERSION = 'sirv-graph-1.0.0'` se exporta desde `experiment.ts`.
Es distinta de `CONTRACT_VERSION`, que identifica los tipos acordados. El contrato
no tiene campo `algorithmVersion`: al guardar una exportación, el integrador puede
guardar esa constante por separado sin modificar `ExperimentResult`. Misma
configuración y versión del algoritmo producen el mismo resultado completo.

El experimento deriva la semilla de red una sola vez y la usa en todas las
repeticiones. `example.networkSeed` es la semilla efectiva: permite regenerar la
red con `generateGraph(population, networkSeed)`. `example.trialSeed` identifica
los eventos de la repetición ilustrada (siempre 0).

## Estadísticas

El percentil por rango más próximo ordena de menor a mayor y toma el índice
`max(0, ceil(p * n) - 1)`. P10–P90 es un rango empírico de ejecuciones, no un
intervalo de confianza del promedio. Los conteos individuales son enteros;
los promedios conservan sus decimales.

Los contagios evitados deben calcularse como referencia menos estrategia en cada
repetición y agregarse después. Se conservan diferencias negativas: vacunar
personas con alto grado no garantiza el mejor resultado bajo toda semilla,
conectividad o combinación de parámetros.

Cada estrategia informa estadísticas de infectados acumulados (incluidos los
iniciales), pico individual y dosis consumidas. La serie `daily` agrega solamente
infectados activos por día. El pico se calcula por ejecución y luego se agrega;
no se toma el pico de la curva promedio. Los snapshots individuales se publican
solamente en `example.timelines`, para las tres estrategias de la repetición 0.

## Integración con el Worker

El rol de interfaz crea el Web Worker y consume `WorkerRequest` y
`WorkerResponse` del contrato. Debe importar:

```ts
import { runExperiment } from '../domain/experiment'
import type { WorkerRequest, WorkerResponse } from '../shared/simulation-contract'
```

Para cada solicitud `run`, debe conservar `requestId` y llamar a
`runExperiment(config, onProgress)`. Cada callback corresponde a una repetición
completada con sus tres estrategias: `{ completed: 1, total }` hasta
`{ completed: repetitions, total }`. El callback se traduce al mensaje `progress`,
la devolución al mensaje `result` y las excepciones al mensaje `error` con ese
mismo `requestId`. El resultado admite structured clone y JSON, y no contiene
reloj, duración, funciones ni referencias al DOM.

La función es síncrona y usa CPU; debe ejecutarse en el Worker, nunca en un render
React. Los callbacks de progreso no cambian los resultados. Para cancelar, el rol
de interfaz puede terminar el Worker y crear uno nuevo; el contrato no define un
mensaje de cancelación ni cancelación cooperativa dentro del motor.

## Validación local

No se requieren servicios externos, claves, backend ni archivo `.env`.
Se conservan las dependencias bloqueadas del repositorio.

```sh
npm ci
npm test
npm run build
npm run dev
```

Las pruebas de grafos pequeños verifican resultados calculados a mano, el orden
de contagio/recuperación, las dosis, los fallos sin revacunación y la conservación
de población. Otras pruebas comprueban que los sorteos compartidos sobreviven a
distintas decisiones y al reordenamiento de aristas.

Medición manual del núcleo (tiempo fuera de los resultados deterministas):

```sh
node scripts/benchmark-motor.mjs
# Opcionales: población, repeticiones, días
node scripts/benchmark-motor.mjs 1000 50 30
```
