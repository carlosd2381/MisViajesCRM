# OpenTelemetry Deployment Profiles

Guía operativa para activar métricas de auth-session por ambiente sin cambiar código.

## Objetivo

Definir presets mínimos para:

- Desarrollo local (`dev`)
- Staging (`staging`)
- Producción (`prod`)

Plantilla rápida:

- Usar `.env.otel.example` como base y ajustar por ambiente.

## Variables relevantes

- `AUTH_OTEL_ENABLED`: habilita sink de contadores auth hacia API global OTel.
- `AUTH_OTEL_METER_NAME`: nombre lógico del meter.
- `AUTH_OTEL_SDK_ENABLED`: inicializa MeterProvider en `src/server.ts`.
- `AUTH_OTEL_EXPORTER`: `console` u `otlp`.
- `AUTH_OTEL_EXPORT_INTERVAL_MS`: intervalo de exportación.
- `AUTH_OTEL_SERVICE_NAME`: nombre de servicio.
- `AUTH_OTEL_SERVICE_VERSION`: versión de despliegue.
- `AUTH_OTEL_ENVIRONMENT`: ambiente (`development`, `staging`, `production`).
- `AUTH_OTEL_OTLP_ENDPOINT`: endpoint OTLP HTTP.
- `AUTH_OTEL_OTLP_HEADERS`: headers OTLP (`k1=v1,k2=v2`).

## Perfil dev

Uso recomendado: validación funcional local sin collector.

```env
AUTH_OTEL_ENABLED=true
AUTH_OTEL_SDK_ENABLED=true
AUTH_OTEL_EXPORTER=console
AUTH_OTEL_EXPORT_INTERVAL_MS=10000
AUTH_OTEL_METER_NAME=misviajescrm.auth
AUTH_OTEL_SERVICE_NAME=misviajescrm-api
AUTH_OTEL_SERVICE_VERSION=0.1.0-local
AUTH_OTEL_ENVIRONMENT=development
```

Resultado esperado:

- Las métricas salen por consola periódicamente.
- Se mantiene disponible `/auth/metrics` y `/auth/metrics/prom` para inspección rápida.

## Perfil staging

Uso recomendado: validar pipeline real hacia collector no productivo.

```env
AUTH_OTEL_ENABLED=true
AUTH_OTEL_SDK_ENABLED=true
AUTH_OTEL_EXPORTER=otlp
AUTH_OTEL_EXPORT_INTERVAL_MS=5000
AUTH_OTEL_METER_NAME=misviajescrm.auth
AUTH_OTEL_SERVICE_NAME=misviajescrm-api
AUTH_OTEL_SERVICE_VERSION=0.1.0-staging
AUTH_OTEL_ENVIRONMENT=staging
AUTH_OTEL_OTLP_ENDPOINT=http://otel-collector.staging:4318/v1/metrics
AUTH_OTEL_OTLP_HEADERS=x-api-key=staging-token
```

Resultado esperado:

- Contadores auth llegan al collector de staging.
- Se valida cardinalidad de labels (`operation`, `outcome`) antes de prod.

## Perfil prod

Uso recomendado: operación estable con collector y credenciales gestionadas.

```env
AUTH_OTEL_ENABLED=true
AUTH_OTEL_SDK_ENABLED=true
AUTH_OTEL_EXPORTER=otlp
AUTH_OTEL_EXPORT_INTERVAL_MS=15000
AUTH_OTEL_METER_NAME=misviajescrm.auth
AUTH_OTEL_SERVICE_NAME=misviajescrm-api
AUTH_OTEL_SERVICE_VERSION=0.1.0
AUTH_OTEL_ENVIRONMENT=production
AUTH_OTEL_OTLP_ENDPOINT=https://otel-collector.prod/v1/metrics
AUTH_OTEL_OTLP_HEADERS=authorization=Bearer-${OTEL_TOKEN}
```

Resultado esperado:

- Métricas exportadas a backend observability productivo.
- Sin dependencia de endpoints de diagnóstico para monitoreo central.

## Checklist de activación

1. Confirmar que `AUTH_OTEL_SDK_ENABLED=true` solo en ambientes donde corresponda.
2. Validar alcance de red al endpoint OTLP.
3. Revisar que el intervalo no sea demasiado bajo para evitar ruido/costo.
4. Verificar presencia de métrica `misviajescrm_auth_refresh_operations_total` en backend.
5. Mantener `AUTH_OTEL_EXPORTER=console` como fallback temporal durante incidentes de collector.

## Riesgos y mitigación

- Endpoint OTLP inaccesible:
  - Mitigar con fallback temporal a `console` y alerta de infraestructura.
- Headers inválidos:
  - Validar credenciales en staging antes de promover a prod.
- Overhead por exportación frecuente:
  - Ajustar `AUTH_OTEL_EXPORT_INTERVAL_MS` a ventanas >= 5000 ms.
