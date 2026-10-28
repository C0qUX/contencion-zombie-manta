# Arquitectura

La primera versión prioriza una entrega reproducible, segura y de bajo costo.

```text
Navegador
   │ HTTPS
   ▼
Amazon CloudFront ── OAC ──► Amazon S3 privado
                                └── aplicación React/Vite
```

## Decisiones

- El modelo SIR se ejecuta en el navegador para eliminar latencia y costo de cómputo durante la fase inicial.
- S3 permanece privado. CloudFront accede mediante Origin Access Control y fuerza HTTPS.
- El modelo es determinista: la misma configuración y semilla produce el mismo resultado.
- La capa de dominio está separada de la interfaz para permitir migrar simulaciones masivas a Lambda, Batch o Fargate sin reescribir la experiencia web.

## Evolución prevista

1. Ejecutar Monte Carlo en AWS Batch o Step Functions Distributed Map.
2. Guardar escenarios en DynamoDB y resultados en S3/Athena.
3. Exponer ejecuciones con API Gateway y Lambda.
4. Incorporar redes reales de barrios, escuelas y transporte de Manta.
