# Mis Viajes CRM — Documentation Hub

Este proyecto mantiene documentación viva para evitar desviaciones de arquitectura y alcance.

## Documentos obligatorios

- `docs/planning/build-plan.md` — plan de construcción por fases y sprint actual.
- `docs/data/data-dictionary.md` — diccionario de datos canónico.
- `docs/governance/project-constraints.md` — reglas técnicas obligatorias (idioma, estructura, tamaño de archivos, granularidad de funciones).

## Documentos operativos

- `docs/operations/otel-deployment-profiles.md` — perfiles recomendados para activar OpenTelemetry en dev/staging/prod.
- `docs/operations/auth-incident-runbook.md` — guía de diagnóstico y mitigación para incidentes de autenticación/sesiones.

## Gobierno de revisiones

- `.github/CODEOWNERS` — archivo activo para enrutar revisión automática en cambios sensibles (auth/ops/CI).
- `.github/CODEOWNERS.example` — plantilla base de referencia.

## Plantillas de entorno

- `.env.otel.example` — plantilla lista para copiar/editar con perfiles OTel de referencia.
- `.env.auth.example` — plantilla base de autenticación/JWT/sesiones para entornos locales y despliegues.

## Quick start de entorno

Orden recomendado para preparar variables locales:

1. Crear archivo de entorno local (ejemplo: `.env.local`).
2. Copiar primero valores de `.env.auth.example`.
3. Si se usará observabilidad, fusionar después `.env.otel.example`.
4. Ajustar secretos y endpoints reales (nunca usar ejemplos en producción).

Notas:

- Mantener `AUTH_MODE=header` para pruebas rápidas sin JWT.
- Cambiar a `AUTH_MODE=token` cuando se validen flujos de sesión y revocación.
- Activar `AUTH_OTEL_SDK_ENABLED=true` solo cuando exista destino de exportación definido.

## Regla operativa

Cada PR que cambie modelo de datos, arquitectura o roadmap debe actualizar los documentos anteriores en el mismo PR.

Checklist de PR disponible en `.github/pull_request_template.md` para mantener validación técnica y operativa consistente.

Además, si se exceden límites soft de tamaño de archivo/función, el PR debe documentar una excepción (motivo, riesgo y plan de refactor).

## Baseline técnico inicial

- Estructura por feature: `src/modules/*`.
- i18n base: `src/core/i18n` + locales por módulo en `src/modules/<feature>/i18n/`.
- Quality gates: `npm run quality`.
	- `quality:file-size`: alerta >300 líneas, falla >450.
	- `quality:function-size`: alerta >30 líneas efectivas, falla >60.

## Comandos de desarrollo

- Ejecutar API local: `npm run dev:api`
- Ejecutar smoke-check de auth: `npm run auth:smoke`
- Ejecutar todas las pruebas: `npm run test`
- Ejecutar pruebas unitarias: `npm run test:unit`
- Ejecutar pruebas de integración HTTP: `npm run test:integration`
- Validar tipos TypeScript: `npm run typecheck`
- Validar ownership de revisión: `npm run quality:codeowners`

CI:

- Workflow `.github/workflows/quality.yml` ejecuta `quality` y `auth-smoke` en matriz `AUTH_MODE=header|token` y locale `es-MX|en-US`.
- El workflow ejecuta `ai-schema-smoke` en matriz `AUTH_MODE=header|token` y locale `es-MX|en-US`.
- El job `auth-smoke` imprime un resumen de modo/flags para facilitar diagnóstico en logs de CI.
- El workflow usa `concurrency` (cancelación de runs previos por rama) y `timeout` por job para evitar ejecuciones colgadas/duplicadas.
- El job `auth-smoke` se ejecuta solo si hay cambios en rutas relevantes de auth/backend/ops/CI.
- También se puede ejecutar manualmente por `workflow_dispatch` usando `force_auth_smoke=true`.
- En ejecución manual, `auth_smoke_modes` permite correr `header`, `token` o `both`.
- En ejecución manual, `auth_smoke_locales` permite correr `es-MX`, `en-US` o `both`.
- En ejecución manual, `ai_schema_smoke_auth_modes` permite correr `header`, `token` o `both`.
- En ejecución manual, `ai_schema_smoke_locales` permite correr `es-MX`, `en-US` o `both`.

### Ejemplos de ejecución manual (CI)

Casos recomendados al lanzar `workflow_dispatch` del workflow de calidad:

1. Validar rápidamente modo token tras cambio en JWT:
	- `force_auth_smoke=true`
	- `auth_smoke_modes=token`
	- `auth_smoke_locales=both`
2. Verificar regresión general auth sin cambios detectados por path filter:
	- `force_auth_smoke=true`
	- `auth_smoke_modes=both`
	- `auth_smoke_locales=both`
3. Verificar solo compatibilidad legacy por headers:
	- `force_auth_smoke=true`
	- `auth_smoke_modes=header`
	- `auth_smoke_locales=es-MX`
4. Verificar localización auth en inglés sin ampliar cobertura:
	- `force_auth_smoke=true`
	- `auth_smoke_modes=token`
	- `auth_smoke_locales=en-US`

### Lectura rápida de summaries (logs CI)

Tanto `auth:smoke` como `ai:schema:smoke` imprimen una línea JSON para diagnóstico rápido:

- `AUTH_SMOKE_SUMMARY {...}`
	- `locale`: locale efectivo del smoke (`es-MX` o `en-US`).
	- `verifyTokenMode`: `true` cuando valida ruta protegida en modo token.
	- `checkedNegativeScenarios`: lista de escenarios negativos efectivamente validados en esa corrida.
- `AI_SCHEMA_SMOKE_SUMMARY {...}`
	- `locale`: locale efectivo del schema smoke.
	- `schemaVersion`: versión de contrato validada.
	- `warningsCatalogCount`: cantidad de warnings esperados en catálogo.
	- `sectionOrder`: orden estable de secciones para consumidores downstream.

Si falta la línea summary o cambia su estructura, tratar el run como sospechoso y revisar artifacts/logs del job.

## Persistencia (modo de almacenamiento)

- `STORAGE_MODE=memory` (default) usa repositorios en memoria.
- `STORAGE_MODE=postgres` usa repositorios PostgreSQL y sesiones de refresh token persistidas (revocación compartida).

Variables requeridas para modo PostgreSQL:

- `DB_HOST`
- `DB_PORT` (default `5432`)
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## Autorización HTTP (RBAC)

Las rutas protegidas (`/leads`, `/clients`) requieren headers:

- `x-user-id`
- `x-user-role` (`owner`, `manager`, `agent`, `accountant`, `external_dmc`)

Si faltan/son inválidos: `401`.
Si no tienen permiso para la acción: `403`.

Modo de autenticación configurable:

- `AUTH_MODE=header` (default): usa `x-user-id` + `x-user-role`.
- `AUTH_MODE=token`: usa `Authorization: Bearer <JWT HS256>`.

Variables para modo token:

- `AUTH_TOKEN_SECRET` (requerido en ambientes reales; en local existe fallback de desarrollo).
- `AUTH_JWT_ISSUER` (default: `misviajescrm.local`).
- `AUTH_JWT_AUDIENCE` (default: `misviajescrm.api`).
- `AUTH_JWT_DEFAULT_KID` (default: `v1`).
- `AUTH_JWT_KEYS` (opcional, formato: `kid1:secret1,kid2:secret2`).
- `AUTH_ACCESS_TTL_SECONDS` (default: `900`).
- `AUTH_REFRESH_TTL_SECONDS` (default: `1209600`).
- `AUTH_PRUNE_ENABLED` (default: `false`; habilita limpieza automática de sesiones expiradas al iniciar API).
- `AUTH_PRUNE_INTERVAL_SECONDS` (default: `900`; intervalo del job automático de limpieza).
- `AUTH_METRICS_LOG_ENABLED` (default: `false`; emite logs JSON de métricas de sesiones auth).
- `AUTH_OTEL_ENABLED` (default: `false`; habilita envío de contadores a OpenTelemetry API global).
- `AUTH_OTEL_METER_NAME` (default: `misviajescrm.auth`; nombre de meter para instrumentos OTel).
- `AUTH_OTEL_SDK_ENABLED` (default: `false`; inicializa MeterProvider SDK en runtime `src/server.ts`).
- `AUTH_OTEL_EXPORTER` (default: `console`; valores: `console`, `otlp`).
- `AUTH_OTEL_EXPORT_INTERVAL_MS` (default: `10000`; intervalo de exportación periódica).
- `AUTH_OTEL_SERVICE_NAME` (default: `misviajescrm-api`).
- `AUTH_OTEL_SERVICE_VERSION` (default: `0.1.0`).
- `AUTH_OTEL_ENVIRONMENT` (default: `development`).
- `AUTH_OTEL_OTLP_ENDPOINT` (opcional; endpoint OTLP HTTP para métricas).
- `AUTH_OTEL_OTLP_HEADERS` (opcional; formato `k1=v1,k2=v2`).

Flujo de sesión JWT (MVP):

- `POST /auth/token` emite par `accessToken` + `refreshToken` (requiere headers `x-user-id` y `x-user-role`).
- `POST /auth/refresh` rota `refreshToken` y entrega nuevo par.
- `POST /auth/revoke` revoca `refreshToken` activo.
- `POST /auth/revoke-all` revoca todas las sesiones activas de un usuario (self por default; manager/owner pueden indicar `userId`).
- `POST /auth/prune` elimina sesiones expiradas (solo `manager`/`owner`).
- `GET /auth/metrics` devuelve contadores de operaciones de sesión auth (solo `manager`/`owner`).
- `GET /auth/metrics/prom` exporta los mismos contadores en formato Prometheus text exposition (solo `manager`/`owner`).

Nota operativa:

- La limpieza automática periódica corre solo al usar `startApiServer` y con `AUTH_PRUNE_ENABLED=true`.
- El bootstrap de SDK OTel corre solo en `src/server.ts` cuando `AUTH_OTEL_SDK_ENABLED=true`.

## Testabilidad del servidor

- `src/app.ts` expone fábrica de servidor reutilizable para pruebas de integración.
- `src/server.ts` queda como entrypoint mínimo para ejecución local/entorno.
