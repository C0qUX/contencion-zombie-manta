# Operación de infraestructura y configuración del equipo

## Datos compartidos (no secretos)

| Dato | Valor |
|---|---|
| Repositorio | https://github.com/C0qUX/contencion-zombie-manta |
| Demo | https://main.d3kt9g5gofzhxh.amplifyapp.com/ |
| Hosting | AWS Amplify Hosting estático |
| Región | us-east-2 (Ohio) |
| App ID | d3kt9g5gofzhxh |
| Rama publicada | main |
| Node | 22 |
| Dependencias | npm ci, con package-lock.json |
| Validación | npm test y npm run build |
| Salida | dist |
| Variables obligatorias | Ninguna para la aplicación actual |
| Credenciales locales AWS | No necesarias para desarrollar o probar |

## Publicar cambios

1. Trabajar en una rama y revisar los cambios antes de integrarlos.
2. Ejecutar `npm ci`, `npm test` y `npm run build`.
3. Integrar en `main`; comprobar la ejecución de Amplify y el commit que publica.
4. Esperar estado de implementación completada.
5. Abrir la URL HTTPS, cambiar parámetros y restablecer el escenario.
6. Si el build falla, revisar el primer error de instalación/pruebas/compilación. No eliminar las pruebas para ocultar fallos.

La configuración del repositorio `amplify.yml` tiene prioridad sobre la configuración de consola. Node 22 debe quedar versionado allí. Fuente: https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html

## Último despliegue verificado

| Dato | Valor |
|---|---|
| Fecha | 30/10/2026, 15:50 UTC |
| Commit publicado | `a165890` (fusión del PR #3) |
| Algoritmo | `seir-places-2.0.0` |
| Método | `index.html` y nombres con hash de `dist/assets` idénticos al build local; `node scripts/verify-ui.cjs` con `UI_BASE_URL` apuntando a la demo |
| Resultado | 11/11 comprobaciones, sin errores de página |
| Evidencia | [verificacion.json](evidencia/aws/verificacion.json), [escritorio](evidencia/aws/escritorio.jpg), [móvil](evidencia/aws/movil.jpg) |

Repetir tras cada integración en `main`, una vez que Amplify termine:

```bash
npm run build
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright \
UI_BASE_URL=https://main.d3kt9g5gofzhxh.amplifyapp.com/ \
UI_EVIDENCE_DIR=docs/evidencia/aws node scripts/verify-ui.cjs
```

## Acceso del equipo

Los colaboradores necesitan acceso al repositorio, Node 22 y npm. No compartir contraseñas, tokens, llaves de AWS ni la sesión del propietario. El responsable de infraestructura administra Amplify y facturación. Limitar la aplicación GitHub de Amplify al repositorio del proyecto. No introducir secretos en código, capturas o variables VITE.

## Recuperación

Conservar la URL pública. Para deshacer un cambio defectuoso, revertir el commit correspondiente en Git y comprobar el despliegue del revert; evitar reescribir el historial compartido. No ejecutar el script alternativo de CloudFormation para recuperar Amplify.

## Pendientes que requieren comprobación humana

- Verificar el destinatario de AWS Budgets; última consulta: Inactive. **Debe verificarse antes del pitch.**
- Las capturas del Budget ya están en el repositorio; mantenerlas sin datos personales si se actualizan.
- Revisar MFA y recuperación del perfil del propietario; no se ha acreditado su configuración.
- Registrar el costo final del evento cuando AWS actualice la facturación.
- Mantener la demo hasta el pitch del 30 de octubre; no eliminar la aplicación antes.
- Probar la URL pública inmediatamente antes de la presentación.
