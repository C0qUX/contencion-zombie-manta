# Costos de infraestructura

Arquitectura actual: AWS Amplify Hosting estático en Ohio (`us-east-2`), sin backend, SSR, dominio comprado ni WAF. Consulta: 30 de octubre de 2026.

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

El 30 de octubre de 2026, AWS Budgets mostraba **0,00 USD** de costo real acumulado de octubre, excluyendo Credit y Refund. Es una observación provisional: el despliegue es reciente y los datos pueden llegar con retraso. No equivale a certificar costo final cero ni a una factura liquidada. Actualizar este apartado al cerrar el evento con los datos de facturación.

## Registro por servicio

Servicios realmente usados por la entrega, con datos observados el 30/10/2026. No se añadió ningún servicio de AWS durante el evento. Las tarifas son las de la página oficial sin capa gratuita; la capa gratuita de Amplify Hosting cubre 1.000 minutos de build, 5 GB de almacenamiento y 15 GB de transferencia al mes durante 12 meses ([precios de Amplify](https://aws.amazon.com/amplify/pricing/)).

| Servicio | Uso en el proyecto | Tarifa de referencia | Uso observado | Costo estimado antes de créditos |
|---|---|---:|---|---:|
| Amplify Hosting: build y despliegue | Cada fusión en `main` instala, prueba y compila | 0,01 USD/min | 7 despliegues desde el 29/10; los tres medidos tardaron entre 1 min 35 s y 2 min 17 s desde la fusión hasta la publicación | ≈ 0,14 USD (≈ 14 min) |
| Amplify Hosting: almacenamiento CDN | `dist` de 1,45 MB por versión, incluido el mapa de fuente | 0,023 USD/GB-mes | < 0,02 GB con los artefactos retenidos | < 0,01 USD/mes |
| Amplify Hosting: transferencia | ≈ 86 KB comprimidos por visita (HTML, JS, Worker y CSS) | 0,15 USD/GB | No medido; 1.000 visitas ≈ 0,09 GB | ≈ 0,013 USD por 1.000 visitas |
| AWS Budgets | Presupuesto de 5 USD con tres alertas, sin acciones | Monitorización y notificaciones sin cargo | 1 presupuesto | 0 USD |
| GitHub Actions (fuera de AWS) | CI en cada PR y en `main` | Sin cargo en repositorios públicos | ≈ 15 s por ejecución | 0 USD |

Las alertas de Budgets son gratuitas, pero solo llegan si el destinatario verificó su correo ([precios de Budgets](https://aws.amazon.com/aws-cost-management/aws-budgets/pricing/)). El costo real final sale de la facturación de la cuenta titular y debe registrarse aquí cuando AWS la actualice.

## Controles

- Presupuesto `spookython-2026-mensual`: 5 USD mensuales recurrentes.
- Costo sin combinar; se excluyen créditos y reembolsos para observar consumo antes de esas compensaciones.
- Alertas por costo real superior a 20 %, 80 % y 100 %: 1, 4 y 5 USD.
- El 30 de octubre se verificaron tres alertas guardadas, pero el destinatario aparecía **Inactive / 0 de 1 verificado**. Debe verificar el correo para recibir avisos.
- Evidencias: [presupuesto de 5 USD](budget.jpg) y [umbrales configurados](budget-alertas.jpg), recortadas para ocultar datos personales.
- El presupuesto no detiene servicios.
- Mantener el plan gratuito. No actualizar a plan de pago ni habilitar servicios o cambios de cuenta que provoquen esa conversión. No se necesita Organizations ni Control Tower para esta arquitectura.
- No activar WAF, dominios de pago ni nuevas ramas de hosting para completar esta entrega.

[Condiciones del plan gratuito](https://aws.amazon.com/free/free-tier-faqs/).
