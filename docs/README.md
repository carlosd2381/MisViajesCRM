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
- Ejecutar smoke-check de auth en token-mode: `npm run auth:smoke:token`
- Ejecutar smoke-check de auth en `en-US`: `npm run auth:smoke:en`
- Ejecutar smoke-check de auth en token-mode + `en-US`: `npm run auth:smoke:token:en`
- Ejecutar smoke-check de schema AI: `npm run ai:schema:smoke`
- Ejecutar smoke-check de schema AI en token-mode: `npm run ai:schema:smoke:token`
- Ejecutar smoke-check de schema AI en `en-US`: `npm run ai:schema:smoke:en`
- Ejecutar smoke-check de schema AI en token-mode + `en-US`: `npm run ai:schema:smoke:token:en`
- Ejecutar smoke-check de render AI (web+pdf): `npm run ai:render:smoke`
- Ejecutar smoke-check de render AI en token-mode: `npm run ai:render:smoke:token`
- Ejecutar smoke-check de render AI en `en-US`: `npm run ai:render:smoke:en`
- Ejecutar smoke-check de render AI en token-mode + `en-US`: `npm run ai:render:smoke:token:en`
- Ejecutar matriz completa de smoke-checks (auth+AI, `header/token`, `es-MX/en-US`): `npm run smoke:matrix`
- Ejecutar matriz completa y persistir resumen JSON: `npm run smoke:matrix:json`
- Ejecutar matriz solo en `AUTH_MODE=token`: `npm run smoke:matrix:token`
- Ejecutar matriz solo para locale `en-US`: `npm run smoke:matrix:en`
- Ejecutar matriz reutilizando API externa en `AUTH_MODE=header`: `npm run smoke:matrix:external:header`
- Ejecutar matriz reutilizando API externa en `AUTH_MODE=token`: `npm run smoke:matrix:external:token`
- Ejecutar todas las pruebas: `npm run test`
- Ejecutar pruebas de utilidades operativas (`tools/ops`): `npm run test:ops`
- Ejecutar pruebas de utilidades de quality (`tools/quality`): `npm run test:quality`
- Ejecutar pruebas unitarias: `npm run test:unit`
- Ejecutar pruebas de integración HTTP: `npm run test:integration`
- Validar tipos TypeScript: `npm run typecheck`
- Validar sintaxis/estructura de workflows CI: `npm run quality:workflows`
- Validar ownership de revisión: `npm run quality:codeowners`

CI:

- Workflow `.github/workflows/quality.yml` ejecuta `quality` y `auth-smoke` en matriz `AUTH_MODE=header|token` y locale `es-MX|en-US`.
- El workflow ejecuta `ai-schema-smoke` en matriz `AUTH_MODE=header|token` y locale `es-MX|en-US`.
- El workflow ejecuta `ai-render-smoke` en matriz `AUTH_MODE=header|token` y locale `es-MX|en-US`.
- El job `quality` ejecuta también `npm run test:ops` para validar contrato de utilidades compartidas en `tools/ops`.
- El job `quality` ejecuta también `npm run test:quality` para validar regresiones de quality gates auxiliares.
- El job `auth-smoke` imprime un resumen de modo/flags para facilitar diagnóstico en logs de CI.
- El workflow usa `concurrency` (cancelación de runs previos por rama) y `timeout` por job para evitar ejecuciones colgadas/duplicadas.
- El job `auth-smoke` se ejecuta solo si hay cambios en rutas relevantes de auth/backend/ops/CI.
- Los jobs de smoke validan que exista `AUTH_SMOKE_SUMMARY` / `AI_SCHEMA_SMOKE_SUMMARY` / `AI_RENDER_SMOKE_SUMMARY` en salida; si falta, el job falla.
- Los summaries detectados se publican también en `GITHUB_STEP_SUMMARY` para lectura rápida del run.
- Los jobs de smoke usan `tools/ops/smoke-summary-cli.mjs` para extracción/parse del summary y publican también el payload parseado para triage consistente.
- Los jobs `auth-smoke`/`ai-schema-smoke`/`ai-render-smoke` usan `tools/ops/ci-api-lifecycle.sh` para manejo homogéneo de `start/wait/stop` de la API local en CI.
- El job `quality` publica `QUALITY_HELPER_TESTS_SUMMARY {pass,fail}` en logs y `GITHUB_STEP_SUMMARY` para triage rápido de regresiones en checks auxiliares.
- El contrato de `QUALITY_HELPER_TESTS_SUMMARY` se centraliza en `tools/quality/quality-summary-helpers.mjs` con cobertura de pruebas dedicada.
- El workflow usa `tools/quality/quality-helper-summary-cli.mjs` para aplicar el contrato de summary en formato/parse sin snippets inline ad-hoc.
- Antes de publicar el summary, el job `quality` valida round-trip parse del contrato (`format`/`parse`) para evitar drift silencioso en CI.
- También se puede ejecutar manualmente por `workflow_dispatch` usando `force_auth_smoke=true`.
- En ejecución manual, `auth_smoke_modes` permite correr `header`, `token` o `both`.
- En ejecución manual, `auth_smoke_locales` permite correr `es-MX`, `en-US` o `both`.
- En ejecución manual, `ai_schema_smoke_auth_modes` permite correr `header`, `token` o `both`.
- En ejecución manual, `ai_schema_smoke_locales` permite correr `es-MX`, `en-US` o `both`.
- En ejecución manual, `ai_render_smoke_auth_modes` permite correr `header`, `token` o `both`.
- En ejecución manual, `ai_render_smoke_locales` permite correr `es-MX`, `en-US` o `both`.
- En ejecución manual, `force_smoke_matrix=true` ejecuta un job consolidado (`smoke:matrix`) y adjunta `tmp/smoke-matrix-summary.json` como artifact.
- En ejecución manual, `smoke_matrix_auth_modes` y `smoke_matrix_locales` permiten limitar el job `smoke-matrix` a subconjuntos (`header,token` / `es-MX,en-US`).
- El job `smoke-matrix` valida que exista `SMOKE_MATRIX_SUMMARY` en salida y publica esa línea en `GITHUB_STEP_SUMMARY`.
- En caso de análisis posterior, el artifact incluye JSON consolidado y `smoke-matrix-output.log`.

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

Casos recomendados para `ai-schema-smoke`:

5. Validar contrato AI en modo token para ambos locales:
	- `force_ai_schema_smoke=true`
	- `ai_schema_smoke_auth_modes=token`
	- `ai_schema_smoke_locales=both`
6. Validar solo contrato AI en inglés (smoke rápido):
	- `force_ai_schema_smoke=true`
	- `ai_schema_smoke_auth_modes=header`
	- `ai_schema_smoke_locales=en-US`
7. Validar render AI en modo token para ambos locales:
	- `force_ai_render_smoke=true`
	- `ai_render_smoke_auth_modes=token`
	- `ai_render_smoke_locales=both`
8. Ejecutar validación consolidada auth+AI en un solo job:
	- `force_smoke_matrix=true`
9. Ejecutar validación consolidada solo token + en-US:
	- `force_smoke_matrix=true`
	- `smoke_matrix_auth_modes=token`
	- `smoke_matrix_locales=en-US`

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
- `AI_RENDER_SMOKE_SUMMARY {...}`
	- `authMode`: modo auth efectivo del render smoke (`header` o `token`).
	- `locale`: locale efectivo del render smoke (`es-MX` o `en-US`).
	- `checks`: lista de checks negativos/positivos validados para `render/web` y `render/pdf`.

Si falta la línea summary o cambia su estructura, tratar el run como sospechoso y revisar artifacts/logs del job.

`npm run smoke:matrix` también imprime `SMOKE_MATRIX_SUMMARY {...}` con el consolidado de todas las corridas de smoke ejecutadas.
Si se define `SMOKE_MATRIX_SUMMARY_FILE`, también escribe ese consolidado en archivo JSON.
También soporta selección parcial por variables: `SMOKE_MATRIX_AUTH_MODES=header|token` y `SMOKE_MATRIX_LOCALES=es-MX|en-US` (listas separadas por coma).
Cada comando invocado por la matriz respeta `SMOKE_MATRIX_COMMAND_TIMEOUT_MS` (default `180000`) para evitar bloqueos indefinidos.
Para reutilizar una API ya levantada (sin spawn interno), usar `SMOKE_MATRIX_REUSE_EXTERNAL_API=true`; en ese modo se requiere un único auth mode (`SMOKE_MATRIX_AUTH_MODES=header` o `token`).
Aliases disponibles para ese modo: `npm run smoke:matrix:external:header` y `npm run smoke:matrix:external:token`.

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
