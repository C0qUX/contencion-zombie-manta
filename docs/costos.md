# Costos de infraestructura

Arquitectura actual: AWS Amplify Hosting estático en Ohio (`us-east-2`), sin backend, SSR, dominio comprado ni WAF. Consulta: 29 de octubre de 2026.

## Estimación mensual antes de créditos y beneficios gratuitos

Escenario ilustrativo, no consumo medido:

| Concepto | Supuesto | Tarifa de referencia | Cálculo USD/mes |
|---|---:|---:|---:|
| Compilación estándar | 40 builds × 5 minutos | 0,01 USD/minuto | 2,00 |
| Almacenamiento CDN | 0,5 GB-mes | 0,023 USD/GB-mes | 0,0115 |
| Transferencia saliente | 5 GB | 0,15 USD/GB | 0,75 |
| Total | | | **2,7615 ≈ 2,76** |

Fuente: [precios oficiales de Amplify](https://aws.amazon.com/amplify/pricing/). Estimación sin impuestos, créditos ni descuentos; no es una promesa de factura ni un límite de gasto. Almacenamiento incluye artefactos retenidos. Las tarifas y beneficios aplicables deben revisarse con la cuenta.

## Consumo registrado durante el evento

El 29 de octubre de 2026, AWS Budgets mostraba **0,00 USD** de costo real acumulado de octubre, excluyendo Credit y Refund. Es una observación provisional: el despliegue es reciente y los datos pueden llegar con retraso. No equivale a certificar costo final cero ni a una factura liquidada. Actualizar este apartado al cerrar el evento con los datos de facturación.

## Controles

- Presupuesto `spookython-2026-mensual`: 5 USD mensuales recurrentes.
- Costo sin combinar; se excluyen créditos y reembolsos para observar consumo antes de esas compensaciones.
- Alertas por costo real superior a 20 %, 80 % y 100 %: 1, 4 y 5 USD.
- El 29 de octubre se verificaron tres alertas guardadas, pero el destinatario aparecía **Inactive / 0 de 1 verificado**. Debe verificar el correo para recibir avisos.
- Pendiente incorporar captura del Budget con alertas, ocultando datos personales.
- El presupuesto no detiene servicios.
- Mantener el plan gratuito. No actualizar a plan de pago ni habilitar servicios o cambios de cuenta que provoquen esa conversión. No se necesita Organizations ni Control Tower para esta arquitectura.
- No activar WAF, dominios de pago ni nuevas ramas de hosting para completar esta entrega.

[Condiciones del plan gratuito](https://aws.amazon.com/free/free-tier-faqs/).
