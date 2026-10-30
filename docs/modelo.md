# Modelo y rigor de 7DaysToSurvive

## Versión y alcance

Algoritmo **seir-places-3.0.0**. Añade la búsqueda acotada de la regla dirigida sobre el motor 2.0.0; la dinámica SEIR, el azar común y las líneas base no cambian, y la regla fija de 2.0.0 sigue siendo una candidata que reproduce exactamente sus resultados.

La versión 2.0.0 conservó las tasas oficiales, pero corrige calendario, acoplamiento del azar y selección aleatoria; por eso sus números cambian frente a 07877a2. No se ajustaron parámetros para producir una victoria.

Es un modelo agregado en cinco grupos: hogares, colegio, mercado, bus y barrio. No hay una red de personas ni aristas individuales, coordenadas o datos sanitarios reales de Manta.

S, E, I, R y V son grupos **excluyentes**: S+E+I+R+V=N. La protección vacunal no se cuenta otra vez dentro de S o R. Los contagios acumulados incluyen los infecciosos iniciales y nuevas exposiciones: N−S−V. No representan fallecimientos ni vidas salvadas.

## Inspiración y fuentes

Inspiración narrativa: COVID-19 y transmisión respiratoria. La OMS describe partículas respiratorias; CDC distingue infección, síntomas y transmisión presintomática:

- [OMS: COVID-19](https://www.who.int/news-room/fact-sheets/detail/coronavirus-disease-(COVID-19))
- [CDC: presentación clínica](https://www.cdc.gov/covid/hcp/clinical-care/covid19-presentation.html)

Estas fuentes justifican distinguir fases; **no calibran las tasas del simulador**. E es latencia hasta ser infeccioso, no incubación clínica hasta síntomas. Se conserva el identificador histórico incubationRate por compatibilidad. No se reproduce una variante real.

## Parámetros: todos son supuestos ficticios de diseño

| Parámetro | Valor oficial | Interpretación |
|---|---:|---|
| Población | 15 000 | Subpoblación educativa, no censo |
| Infectados iniciales | 35, mercado | Casos ficticios dentro del lugar solicitado |
| Horizonte | 90 días | Ventana de planificación |
| Contagiosidad | 0,34 | Intensidad agregada, no probabilidad por arista |
| Progresión E→I | 0,22/día | Probabilidad geométrica; media aproximada 4,55 días |
| Recuperación | 0,16/día | Probabilidad geométrica; media aproximada 6,25 días |
| Capacidad | 180 dosis/día | Límite operativo |
| Stock total | 15 120 | Presupuesto 180×(90−6) implícito en el motor anterior, ahora explícito |
| Inicio | Día 6 | Al principio del día, antes de nuevas exposiciones |
| Eficacia | 0,82 | Protección inmediata por intento |
| Semilla / corridas | 2026 / 120 | Valor público, configurable; no semilla optimizada |

Las proporciones de lugar son 42/18/14/12/14 %. Sus coeficientes de conectividad son 1; 1,18; 1,35; 1,48; 1,12. Son pesos sintéticos, no centralidades medidas. El residuo de redondeo va al último grupo.

## Paso diario

1. Día 0: estado inicial, sin acciones.
2. Cada día 1..days: vacunar si se alcanzó el inicio y queda stock.
3. Ofrecer dosis solo a S. Cada intento consume una dosis; un éxito cambia S→V.
4. Con las I y E iniciales del día, sortear exposiciones, progresiones y recuperaciones.
5. Aplicar simultáneamente y guardar snapshot final.

Las nuevas E no progresan ese día; las nuevas I no transmiten ni se recuperan hasta el siguiente. R y V permanecen inmunes. No hay nacimientos, muertes ni reinfección. Un fallo vacunal conserva S y puede recibir otro intento otro día: el modelo agregado no identifica personas ni intentos previos.

Se rechazan números no finitos, fracciones donde se exigen enteros, lugares desconocidos y casos iniciales que excedan su lugar. No se derraman casos ni se corrigen silenciosamente entradas.

## Transmisión y aproximación

Para el lugar j: exposición local = Ij/Nj. La exposición conectada es la media de Ik/Nk de otros lugares, ponderada por la media de sus conectividades. Fuerza = transmissionRate × (0,74×local + 0,26×conectada). Probabilidad diaria S→E = 1−exp(−fuerza).

74/26 es un supuesto fijo, no movilidad medida. Los conteos usan binomial exacta mediante ensayos en grupos de hasta 80 y aproximación normal redondeada/acotada en grupos mayores. Puede ser imprecisa en colas y probabilidades extremas. Las bandas describen este simulador aproximado; no aportan validación clínica.

## Asignaciones

**Dirigida (búsqueda acotada):** prioridad del lugar j = (1 + P_j)^k × c_j^a × (0,35 + w × prevalencia_j), con prevalencia = (I + 0,6E)/N y conectividad c_j. P_j es el potencial de propagación: exposiciones diarias que causaría un infeccioso en j, sin el factor común de contagiosidad, con la misma mezcla 74/26 del paso diario y los susceptibles que quedan tras las dosis ya asignadas:

P_j = [0,74 × S_j + 0,26 × Σ_{m≠j} ((c_j + c_m)/2) × S_m / 4] / N_j

- **Repartir** multiplica la prioridad por S_j y reparte proporcionalmente sin exceder susceptibles; los restos enteros van por prioridad.
- **Concentrar** asigna el día en 20 tandas al lugar de mayor prioridad y recalcula P_j tras cada tanda.

Candidatas: modo {repartir, concentrar} × k {0, 1, 2, 4} × w {0, 12} × a {0, 1} = 32 reglas. La regla fija de 2.0.0 es repartir, k=0, w=12, a=1. Cada candidata se simula en 24 futuros de calibración (índices de corrida desde 1 000 000, que nunca se evalúan) con los mismos eventos aleatorios; gana la menor media de contagios acumulados y un empate conserva la regla fija. Sin dosis disponibles o con eficacia 0 no se busca. La elegida se evalúa en las corridas 0..n−1, igual que el azar y no intervenir, y también frente a la regla fija en esas mismas corridas. Pesos y familia son decisiones de diseño ficticias, no estimaciones sanitarias.

**Azar:** muestreo uniforme sin reemplazo entre susceptibles del día. Un boleto entre elegibles restantes por dosis. Si las dosis superan la mitad de elegibles, se muestrea el conjunto complementario: distribución equivalente y menos trabajo. Se eliminó el reparto aproximado con relleno por orden de lugar.

**Ninguna:** cero dosis.

Ambas políticas de vacunación comparten capacidad, stock, eficacia, inicio, horizonte y estado inicial. **No garantizan consumo realizado idéntico**, porque modifican la elegibilidad. Se registra por separado y no se desperdician dosis artificialmente para igualarlo. Es una comparación con presupuesto disponible equivalente, no eficiencia causal por idéntico número de dosis consumidas. Suponer observación perfecta de S/E/I/R/V es una limitación fuerte.

## Azar común y métricas

Mulberry32 produce cada flujo. Se mezclan claves semilla/corrida/día/lugar/evento con aritmética de 32 bits. La estrategia no aparece en la clave. Transmisión, progresión, recuperación, eficacia y reparto tienen eventos separados. Una rama o selección no desplaza sorteos posteriores.

Es un acoplamiento de números aleatorios comunes agregado, no el seguimiento de los mismos individuos entre políticas. No garantiza superioridad. Hay posibles colisiones de 32 bits; no es criptográfico.

Por corrida: diferencia = contagios de referencia − dirigidos. Después se agregan las diferencias, incluidos negativos. Media de diferencias coincide con diferencia de medias; los percentiles requieren pareamiento.

- Media, mínimo, máximo y P10/P90 de acumulados.
- Percentiles por interpolación lineal en posición (n−1)p, conservando el criterio anterior.
- Pico y día del pico por corrida, después promedio. El día medio puede ser fraccionario.
- Tres curvas de infecciosos y sus bandas.
- P10–P90 es variabilidad entre ejecuciones, no intervalo de confianza de la media.
- Esquema individual: siempre corrida 0, sin selección favorable.
- Duración fuera del resultado determinista, dependiente del dispositivo.

## Evidencia y sensibilidad

Ejecutar **node scripts/audit-scenarios.mjs**. Batería fijada antes de ver resultados: semillas 2026, 42, 12345, 98765, 314159; ocho escenarios; 120 corridas. Total: 40 experimentos, 4 800 corridas pareadas y 14 400 trayectorias.

Resultados: [sensibilidad.json](evidencia/sensibilidad.json). En las 40 combinaciones la media dirigida frente al azar fue positiva y el P10 pareado más bajo fue +100,9; la ganancia media frente a la regla fija va de 144 a 392 contagios según el escenario. No prueba superioridad universal. Búsqueda separada de casos límite: población 100, una corrida, semilla 9, stock 10 y capacidad 2; dirigida pierde por cuatro contagios. Se conserva como regresión negativa, no como escenario recomendado.

Se conservan las 12 pruebas originales. Las nuevas cubren invariantes, recursos, extremos, muestreo, validación, pareamiento, pérdidas reales y la búsqueda: separación entre calibración y evaluación, líneas base intactas y reproducción exacta del resultado publicado de 2.0.0 con la regla fija.
