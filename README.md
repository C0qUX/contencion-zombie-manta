# Contención Zombie Manta

Herramienta de apoyo a decisiones que simula la propagación de un brote y compara una estrategia de vacunación con dos líneas base: no intervenir e intervenir tarde con menos recursos.

## Estado del proyecto

- Modelo SIR determinista ejecutado día a día.
- Interfaz interactiva para modificar población, contagio, vacunas e inicio de la intervención.
- Comparación cuantitativa de escenarios y recomendación en lenguaje simple.
- Pruebas de reproducibilidad, conservación de población y comparación de estrategias.
- Infraestructura como código para S3 privado + CloudFront mediante CloudFormation.

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

Con AWS CLI autenticada y permisos para CloudFormation, S3 y CloudFront:

```powershell
./scripts/deploy-aws.ps1
```

El script crea/actualiza el stack, publica `dist/`, invalida la caché y devuelve la URL HTTPS. La infraestructura está descrita en [`infra/template.yaml`](infra/template.yaml).

## Supuestos del modelo

- Población cerrada durante el horizonte simulado.
- Mezcla homogénea: cada persona tiene la misma probabilidad de contacto.
- Las personas vacunadas dejan de ser susceptibles el mismo día.
- La intervención también reduce 18 % la transmisión para representar comunicación y medidas preventivas.
- No se modelan nacimientos, fallecimientos, reinfección ni pérdida de inmunidad en esta fase.

Los números son parámetros de simulación, no predicciones clínicas. Deben calibrarse con fuentes epidemiológicas antes de tomar decisiones reales.

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

## Equipo

Proyecto desarrollado para SpookyThon 2028 · Track B: La Plaga Zombie.

## Licencia

MIT
