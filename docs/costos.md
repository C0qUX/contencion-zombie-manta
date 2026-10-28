# Estimación de costos

Estimación inicial para una aplicación estática con tráfico de hackathon. Los valores deben validarse en AWS Pricing Calculator antes de producción.

| Servicio | Supuesto mensual | Estimación |
|---|---:|---:|
| Amazon S3 | Menos de 1 GB almacenado | < USD 0,10 |
| CloudFront | Menos de 10 GB transferidos | USD 0–1,00 |
| CloudFormation | Sin costo adicional | USD 0 |
| Route 53 | No incluido; se usa dominio de CloudFront | USD 0 |

**Total esperado:** entre USD 0 y USD 1,10 al mes, sujeto a región, tráfico y nivel gratuito. Durante el evento se debe configurar AWS Budget con una alerta desde el primer día.
