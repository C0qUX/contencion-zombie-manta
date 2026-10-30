# Arquitectura desplegada

![Arquitectura](arquitectura.svg)

El SVG es también el archivo fuente editable del diagrama.

- URL pública: https://main.d3kt9g5gofzhxh.amplifyapp.com/
- Región de la aplicación: Ohio, `us-east-2`.
- Aplicación de Amplify: `d3kt9g5gofzhxh`; rama de producción: `main`.
- Hosting estático administrado por AWS Amplify con HTTPS. SSR deshabilitado.
- GitHub entrega el código a Amplify; `amplify.yml` instala dependencias con el lockfile, ejecuta pruebas y compila a `dist`.
- La simulación actual se ejecuta en el navegador. No existe una API, base de datos ni almacenamiento remoto de escenarios.
- Son públicos el repositorio, los archivos JavaScript/HTML/CSS y la URL de la demo. La administración de AWS requiere autenticación.
- No se necesitan claves de AWS ni secretos de API en el cliente. Las variables `VITE_*` serían públicas.
- AWS Budgets observa costos; no forma parte del flujo de simulación ni impone un límite duro de consumo.

## Alternativa histórica

`infra/template.yaml` y `scripts/deploy-aws.ps1` describen una alternativa S3/CloudFront con CloudFormation. No son el procedimiento del despliegue actual. No ejecutarlos para actualizar Amplify ni crear infraestructura duplicada.

## Operación

Ver [operación y configuración del equipo](infraestructura.md) y [costos](costos.md).
