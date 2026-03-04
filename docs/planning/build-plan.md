# Build Plan (Documento Vivo)

Estado: Activo
Última actualización: 2026-03-04

## Objetivo del producto

Construir un CRM de agencia de viajes AI-native con interfaz primaria en `es-MX`, opción `en-US`, y módulos de Leads/Clientes, Proveedores, Itinerarios, Mensajería omnicanal, Finanzas/Comisiones, Dashboard y Administración.

## Principios de ejecución

- Entregar valor por fases verticales (end-to-end por feature).
- "es-MX first" en cada entregable.
- Mantener acoplamiento bajo entre módulos.
- Seguridad y trazabilidad desde el inicio (RBAC + audit logs).

## Fase 0 — Foundation (Semana 1)

- Setup monorepo/app base y estándares de código.
- Base de autenticación y RBAC.
- Auditoría de cambios (eventos críticos).
- i18n framework (`es-MX` default, `en-US` opcional).
- Pipeline CI básico + validaciones de calidad.

**Entregables:**
- Skeleton por feature en `src/modules/*`.
- Configuración i18n global.
- Middleware de autorización y auditoría.

## Fase 1 — Core CRM MVP (Semanas 2-4)

- Módulo Leads/Clientes (captura, conversión Lead→Cliente, perfil base).
- Módulo Proveedores (perfil, contactos, comisión, payout terms).
- Itinerario básico (CRUD + estados Draft/Proposal/Booked).
- Mensajería base (thread unificado + notas internas).

**Entregables:**
- Flujo operativo mínimo de venta y seguimiento.
- Persistencia de entidades núcleo con validaciones.

## Fase 2 — AI Core & Proposal Experience (Semanas 5-7)

- Integración de Prompt Library (Storyteller, Auditor, Ghost Writer, Local Insider).
- Generación de narrativa por día y resumen de propuesta.
- Generación PDF (estructura y layout controlado).
- Controles de calidad lógica antes de envío.

**Entregables:**
- Propuesta web + PDF con asistencia AI.
- Auditoría lógica automática previo a envío.

## Fase 3 — Financials & Compliance (Semanas 8-10)

- Ledger multicurrency (original + MXN + tipo de cambio).
- Motor de comisiones y reconciliación.
- Gestión de pagos y estatus.
- Preparación CFDI 4.0 y componentes SAT requeridos.

**Entregables:**
- Visibilidad de margen y comisiones.
- Base para facturación fiscal México.

## Fase 4 — Insights, Automations & Hardening (Semanas 11-12)

- Dashboard de owner/manager con KPIs.
- Automatizaciones de marketing/ciclo de vida.
- Hardening de seguridad, observabilidad y performance.
- UAT final y checklist de salida.

**Entregables:**
- Reportería ejecutiva.
- Go-live checklist completado.

## Sprint actual (Kickoff)

1. Definir esquema inicial y contratos API del dominio núcleo.
2. Implementar infraestructura base de i18n y RBAC.
3. Crear módulo Leads/Clientes v1.
4. Crear módulo Proveedores v1.
5. Preparar pipeline AI (mock + contrato JSON).

### Estado de implementación del kickoff

- Estructura base por feature inicializada en `src/modules/*`.
- Base i18n creada con locale default `es-MX` y soporte `en-US`.
- Quality gates automáticos agregados para tamaño de archivo, tamaño de función y documentos obligatorios.

### Estado de implementación de Sprint 1 (en progreso)

- RBAC base implementado en `src/core/auth` (roles, permisos y guardas de autorización).
- Contratos API iniciales definidos para `leads` y `clients`.
- Borrador de migración inicial creado en `db/migrations/20260303_001_init_core.sql`.
- Endpoints HTTP iniciales y adapters in-memory implementados para `leads` y `clients`.
- Servidor local ejecutable agregado en `src/server.ts` con script `npm run dev:api`.
- Validaciones de entrada agregadas para `POST/PATCH` en `leads` y `clients`.
- Capa persistente PostgreSQL agregada con switch por `STORAGE_MODE`.
- Autorización RBAC aplicada en rutas (`/leads`, `/clients`) vía headers HTTP.
- Pruebas unitarias iniciales agregadas para validación y mapeo de permisos.
- Pruebas de integración HTTP end-to-end agregadas para health, auth y flujo básico leads/clients.
- Separación `app.ts` (fábrica testable) y `server.ts` (entrypoint runtime) completada.
- Autenticación por token migrada a JWT estándar HS256 con validación de `issuer`/`audience` y soporte de `kid` por keyring (`AUTH_JWT_KEYS`).
- Flujo MVP de sesión implementado: emisión de token pair (`/auth/token`), rotación (`/auth/refresh`) y revocación (`/auth/revoke`) con store in-memory.
- Persistencia de refresh sessions en PostgreSQL implementada para revocación compartida entre instancias.
- Endpoint de cierre global por usuario (`/auth/revoke-all`) y limpieza on-demand de expiradas (`/auth/prune`) implementados.
- Limpieza automática periódica de sesiones expiradas implementada por configuración (`AUTH_PRUNE_ENABLED`, `AUTH_PRUNE_INTERVAL_SECONDS`).
- Métricas operativas de sesión expuestas (`/auth/metrics`) con opción de logs JSON (`AUTH_METRICS_LOG_ENABLED`).
- Exportación Prometheus text exposition agregada en `/auth/metrics/prom`.
- Adaptador opcional OpenTelemetry agregado para contadores de sesión auth (`AUTH_OTEL_ENABLED`).
- Bootstrap opcional de SDK OTel agregado en runtime (`AUTH_OTEL_SDK_ENABLED`) con exportador `console|otlp`.
- Pipeline de collector/retención por ambiente documentado para `dev/staging/prod` en `docs/operations/otel-deployment-profiles.md`.
- Siguiente foco: iniciar Proposal Experience con render web + primer borrador de PDF desde contrato `ai-proposal.v1`.

### Estado de implementación de Sprint 2 (en progreso)

- Módulo `itinerary` inicial implementado con dominio, contratos, validación, servicio de mapeo y handlers HTTP.
- Repositorios `in-memory` y `postgres` agregados para itinerarios, integrados al `RepositoryBundle`.
- Rutas protegidas RBAC habilitadas para `/itineraries` y `/itineraries/:id`.
- Migración SQL de itinerarios agregada en `db/migrations/20260304_003_itineraries.sql`.
- Cobertura inicial agregada: pruebas unitarias de validación y pruebas de integración para flujo crear/consultar itinerario.
- Flujo de aprobación agregado para itinerarios (`POST /itineraries/:id/approve`) con permiso RBAC `approve:itineraries`.
- Registro de auditoría agregado para acciones clave de itinerario (create/update/approve) en modo PostgreSQL.
- Subrecurso de items agregado para itinerarios (`GET/POST /itineraries/:id/items`) con recálculo automático de totales.
- Módulo `suppliers` v1 implementado (dominio/API/validación/repositorios/rutas RBAC) con migración SQL base y cobertura inicial de integración.
- Módulo `commissions` v1 implementado (dominio/API/validación/repositorios/rutas RBAC) con migración SQL base y cobertura inicial de integración.
- Módulo `financials` v1 implementado (dominio/API/validación/repositorios/rutas RBAC) con migración SQL base y cobertura inicial de integración.
- Módulo `messaging` v1 implementado (dominio/API/validación/repositorios/rutas RBAC) con migración SQL base y cobertura inicial de integración.
- Módulo `dashboard` v1 implementado (dominio/API/validación/repositorios/rutas RBAC) con migración SQL base y cobertura inicial de integración.
- Módulo `management` v1 implementado (dominio/API/validación/repositorios/rutas RBAC) con migración SQL base y cobertura inicial de integración.
- Pipeline AI mock + contrato JSON implementado vía endpoint protegido `POST /ai/proposal` con perfiles base (Storyteller, Auditor, Ghost Writer, Local Insider).
- Reglas de quality-auditor AI agregadas en `/ai/proposal` con warnings estructurados por consistencia y completitud del resumen.
- Secciones JSON por perfil agregadas en `/ai/proposal` para consumo de renderizado (storyteller, auditor, ghost_writer, local_insider).
- Contrato AI versionado (`schemaVersion`) y orden estable de secciones (`sectionOrder`) agregados para integraciones de render/PDF.
- Modo estricto de quality gate agregado en `/ai/proposal` mediante `enforceQualityGate` (respuesta `422` cuando existan warnings `high`).
- Endpoint de capacidad `GET /ai/schema/proposal` agregado para negociación de contrato por clientes (campos, warnings y quality gate).
- Endpoint de esquema AI ahora soporta `?locale=es-MX|en-US` para descripciones localizadas de warnings en tooling UI.
- Endpoint de esquema AI ahora incluye bloque `examples` (request/success/blocked) para bootstrap de UI mock y pruebas contract-first.
- Proposal Experience iniciada con render web (`POST /ai/proposal/render/web`) y borrador PDF (`POST /ai/proposal/render/pdf`) derivados del contrato `ai-proposal.v1`.
- Script operativo `npm run ai:schema:smoke` agregado para validar contrato de `/ai/schema/proposal` en smoke checks.
- Job CI `ai-schema-smoke` agregado en workflow de quality con filtro de cambios, matriz de locale (`es-MX|en-US`) y ejecución manual forzada.
- Smoke-check AI endurecido con validación explícita de `schemaVersion`, contrato `qualityGate`, orden de secciones y localización por locale.
- Smoke-check AI ahora incluye validaciones negativas de autorización para `/ai/schema/proposal` (sin credenciales y rol inválido).
- Smoke-check AI ahora valida también método inválido en `/ai/schema/proposal` (`POST` debe responder `405`).
- Smoke-check AI valida localización de mensajes de error en escenarios negativos (`401` y `405`) según locale activo.
- Smoke-check AI valida también localización del mensaje exitoso (`200`) en `/ai/schema/proposal` por locale activo.
- Smoke-check de render AI agregado para `POST /ai/proposal/render/web` y `POST /ai/proposal/render/pdf`, con matriz `header|token` y `es-MX|en-US`.
- Refactor de enrutamiento aplicado: `app.ts` delega rutas de módulos a `src/core/http/module-route-dispatcher.ts` para reducir tamaño de archivo/función y mantener comportamiento.

## Mantenimiento del documento

Actualizar este archivo cuando cambie cualquiera de estos puntos:

- Prioridad de módulos
- Secuencia de fases
- Definición de entregables
- Riesgos y dependencias críticas

## Registro de cambios

- 2026-03-04: Se extrajo helper de evaluación de scope por matriz en CI (`tools/ops/ci-matrix-scope.sh`) y se aplicó a jobs smoke manuales.
- 2026-03-04: Se extrajo helper de publicación de `GITHUB_STEP_SUMMARY` (`tools/ops/ci-step-summary.sh`) y se aplicó a jobs de quality/smoke.
- 2026-03-04: Se extrajo helper de ciclo de vida API en CI (`tools/ops/ci-api-lifecycle.sh`) y se aplicó a jobs smoke para `start/wait/stop` homogéneos.
- 2026-03-04: Se extrajo CLI reutilizable de summaries smoke (`tools/ops/smoke-summary-cli.mjs`) y se aplicó en workflow CI para extracción/parse homogéneos.
- 2026-03-04: Se extrajo CLI reutilizable (`tools/quality/quality-helper-summary-cli.mjs`) para formateo/parse de `QUALITY_HELPER_TESTS_SUMMARY` y simplificación de workflow CI.
- 2026-03-04: Job `quality` ahora valida round-trip parse de `QUALITY_HELPER_TESTS_SUMMARY` antes de publicarlo en `GITHUB_STEP_SUMMARY`.
- 2026-03-04: Se estandarizó `QUALITY_HELPER_TESTS_SUMMARY` con helper compartido (`tools/quality/quality-summary-helpers.mjs`) y cobertura de contrato dedicada.
- 2026-03-04: Job `quality` ahora publica `QUALITY_HELPER_TESTS_SUMMARY {pass,fail}` en logs y `GITHUB_STEP_SUMMARY` para diagnóstico rápido.
- 2026-03-04: Workflow de calidad ahora ejecuta `npm run test:quality` para validar en CI la cobertura de regresión de checks auxiliares.
- 2026-03-04: Se agregó cobertura de regresión para quality gate de workflows (`tools/quality/check-workflow-yaml.test.mjs`) y comando `npm run test:quality`.
- 2026-03-04: Se agregó quality gate de workflows (`npm run quality:workflows`) para validar sintaxis YAML y estructura mínima (`on`/`jobs`) en `.github/workflows/*`.
- 2026-03-04: Workflow de calidad ahora ejecuta `npm run test:ops` para detectar regresiones en helpers operativos compartidos.
- 2026-03-04: Se agregó cobertura de contrato para helpers de summary de smoke (`tools/ops/smoke-summary-helpers.test.mjs`) y comando `npm run test:ops`.
- 2026-03-04: Se agregaron aliases operativos `smoke:matrix:external:header` y `smoke:matrix:external:token` para ejecutar modo de reutilización de API externa en un solo comando.
- 2026-03-04: `smoke:matrix` ahora soporta reutilizar API externa con `SMOKE_MATRIX_REUSE_EXTERNAL_API=true` (sin spawn interno) y validación de auth mode único para evitar colisiones locales de puerto.
- 2026-03-04: Se cerró pendiente de pipeline OTel al documentar perfiles `dev/staging/prod` y se definió siguiente foco en Proposal Experience (render web + borrador PDF).
- 2026-03-04: Se implementó primer slice de Proposal Experience con endpoints de render `web` (HTML) y `pdf` (borrador) basados en `ai-proposal.v1`.
- 2026-03-04: Se agregó `ai-render-smoke` (script + CI + documentación) para validar render web/pdf con checks negativos de auth/método y matriz `AUTH_MODE`/locale.
- 2026-03-04: Se amplió quick triage operativo en runbook para incluir `AI_RENDER_SMOKE_SUMMARY` y diagnóstico rápido de fallas render web/pdf en CI.
- 2026-03-04: Se refactorizó despacho de rutas HTTP a `module-route-dispatcher` y se eliminó alerta soft de tamaño en `src/app.ts`.
- 2026-03-04: Se separaron pruebas de render AI a `src/integration/ai-render.integration.test.ts`, eliminando alerta soft de tamaño en `src/integration/ai.integration.test.ts`.
- 2026-03-04: Se separó prueba de items de itinerario a `src/integration/itinerary-items.integration.test.ts`, eliminando alerta soft remanente en integración y dejando `quality:file-size` en verde.
- 2026-03-04: Se completó sweep de verificación final con `npm run quality`, `npm run typecheck` y `npm run test` en verde.
- 2026-03-04: Se agregó prueba unitaria de contrato para orden estable de despacho en `src/core/http/module-route-dispatcher.test.ts` y export explícito de `MODULE_ROUTE_DISPATCH_ORDER`.
- 2026-03-04: Se agregó harness compartido de integración (`src/integration/test-harness.ts`) y se migraron suites `ai`, `ai-render` e `itinerary-items` para reducir boilerplate de setup/teardown.
- 2026-03-04: Se completó migración de suites de integración restantes (`auth`, `auth-metrics`, `http`, `itinerary`, `suppliers`, `commissions`, `financials`, `messaging`, `dashboard`, `management`) al harness compartido.
- 2026-03-04: Se agregaron helpers compartidos de auth para pruebas/smoke (`issueIntegrationTokenPair`, `bearerHeaders`, `tools/ops/smoke-auth-helpers.mjs`) y se migraron scripts `auth/ai-schema/ai-render` a esas utilidades.
- 2026-03-04: Se extrajeron utilidades comunes de smoke (`tools/ops/smoke-common-helpers.mjs`) para assertions y localización de mensajes compartida entre `auth`, `ai-schema` y `ai-render`.
- 2026-03-04: Se estandarizó contrato de summary-lines de smoke con helpers compartidos (`tools/ops/smoke-summary-helpers.mjs`) usados por scripts de smoke y parser de `smoke-matrix`.
- 2026-03-03: Versión inicial creada desde análisis de requerimientos PDFs.
- 2026-03-03: Se inicializó estructura feature-first, base i18n y workflow de quality gates.
- 2026-03-03: Se agregaron contratos Leads/Clients, RBAC base y borrador de migración SQL inicial.
- 2026-03-03: Se agregaron rutas HTTP Leads/Clients, repositorios in-memory y server local TypeScript.
- 2026-03-03: Se agregaron validaciones de entrada y repositorios PostgreSQL con bootstrap por entorno.
- 2026-03-03: Se aplicó autorización RBAC en rutas y se añadieron pruebas unitarias iniciales.
- 2026-03-03: Se añadieron pruebas de integración HTTP y refactor de bootstrap para testabilidad.
- 2026-03-03: Se añadió modo de autenticación por token y cobertura de pruebas para ambos modos de auth.
- 2026-03-03: Se migró el modo token a JWT estándar con validación de claims y selección de clave por `kid`.
- 2026-03-03: Se ajustó política de calidad a umbrales soft/hard (archivo y función) con proceso formal de excepciones.
- 2026-03-03: Se agregó flujo MVP de refresh/revoke para sesiones JWT con cobertura de pruebas.
- 2026-03-03: Se agregó persistencia PostgreSQL para `auth_refresh_sessions` y bootstrap por `STORAGE_MODE`.
- 2026-03-03: Se agregaron endpoints `/auth/revoke-all` y `/auth/prune` con controles de rol.
- 2026-03-03: Se agregó job opcional de limpieza periódica de refresh sessions en startup.
- 2026-03-03: Se agregaron contadores de operaciones de sesión auth y endpoint interno de métricas.
- 2026-03-03: Se agregó endpoint Prometheus para métricas de sesión auth.
- 2026-03-03: Se agregó sink opcional OpenTelemetry para contadores de sesión auth.
- 2026-03-03: Se agregó bootstrap opcional de MeterProvider OTel y configuración de exportadores.
- 2026-03-03: Se documentaron perfiles operativos OTel (dev/staging/prod) para despliegue.
- 2026-03-03: Se agregó plantilla `.env.otel.example` para onboarding rápido de configuración OTel.
- 2026-03-03: Se agregó plantilla `.env.auth.example` para onboarding rápido de configuración de autenticación/JWT.
- 2026-03-03: Se agregó quick-start de entorno con orden recomendado de plantillas (`auth` + `otel`).
- 2026-03-03: Se agregó runbook operativo para incidentes de auth/JWT/sesiones/OTel.
- 2026-03-03: Se agregó script `npm run auth:smoke` para validación rápida de endpoints auth/session/metrics.
- 2026-03-03: Se endureció `auth:smoke` con checks negativos localizados (`401` no autenticado, `403` acceso denegado, `401` refresh inválido) y resumen estructurado de ejecución.
- 2026-03-03: Se agregó check negativo adicional en modo token para ruta protegida sin bearer (`401` localizado en `/leads`) cuando `AUTH_SMOKE_VERIFY_TOKEN_MODE=true`.
- 2026-03-03: Se agregó job CI `auth-smoke` en workflow de calidad para detección temprana de regresiones auth.
- 2026-03-03: Se amplió `auth-smoke` en CI para cubrir matriz `AUTH_MODE=header|token` y ruta protegida con bearer.
- 2026-03-03: Se agregó resumen de ejecución (`mode`/flags) en logs de CI para `auth-smoke`.
- 2026-03-03: Se agregó control de concurrencia y timeout por job en workflow de calidad.
- 2026-03-03: Se agregó filtro por rutas para ejecutar `auth-smoke` solo cuando hay cambios relevantes.
- 2026-03-03: Se agregó `workflow_dispatch` con `force_auth_smoke` para ejecución manual del smoke-check.
- 2026-03-03: Se agregó selector manual `auth_smoke_modes` (`header|token|both`) para runs on-demand.
- 2026-03-03: Se amplió `auth-smoke` en CI para matriz de locale (`es-MX|en-US`) y selector manual `auth_smoke_locales` en `workflow_dispatch`.
- 2026-03-03: Se documentó lectura rápida de `AUTH_SMOKE_SUMMARY` y `AI_SCHEMA_SMOKE_SUMMARY` en `docs/README.md` para diagnóstico operativo en CI.
- 2026-03-03: Se agregaron ejemplos manuales para `force_ai_schema_smoke` y selectores `ai_schema_smoke_auth_modes`/`ai_schema_smoke_locales` en docs y checklist de PR.
- 2026-03-03: Se agregó tabla de quick triage en `docs/operations/auth-incident-runbook.md` para mapear señales de summaries (`AUTH_SMOKE_SUMMARY`/`AI_SCHEMA_SMOKE_SUMMARY`) a acciones operativas.
- 2026-03-03: Se endurecieron jobs CI de smoke para fallar si no aparece `*_SMOKE_SUMMARY` y publicar dicha línea en `GITHUB_STEP_SUMMARY`.
- 2026-03-03: Se agregaron aliases npm para smoke-checks frecuentes (`auth:smoke:token`, `auth:smoke:en`, `ai:schema:smoke:token`, `ai:schema:smoke:en`).
- 2026-03-03: Se agregaron aliases combinados `token+en-US` para smoke-check rápido (`auth:smoke:token:en`, `ai:schema:smoke:token:en`).
- 2026-03-03: Se agregó script operativo `npm run smoke:matrix` para ejecutar smoke-checks auth+AI en matriz completa (`header/token` × `es-MX/en-US`).
- 2026-03-03: `smoke:matrix` ahora emite `SMOKE_MATRIX_SUMMARY` con consolidado JSON de todas las corridas ejecutadas.
- 2026-03-03: `smoke:matrix` ahora soporta exportar consolidado a archivo (`SMOKE_MATRIX_SUMMARY_FILE`) y alias `smoke:matrix:json`.
- 2026-03-03: `smoke:matrix` ahora soporta selección parcial por `SMOKE_MATRIX_AUTH_MODES` y `SMOKE_MATRIX_LOCALES` (con aliases `smoke:matrix:token` y `smoke:matrix:en`).
- 2026-03-03: Se agregó job manual `smoke-matrix` en CI (`workflow_dispatch` con `force_smoke_matrix=true`) con artifact `smoke-matrix-summary`.
- 2026-03-03: Se endureció job `smoke-matrix` para exigir `SMOKE_MATRIX_SUMMARY`, publicarlo en `GITHUB_STEP_SUMMARY` y adjuntar `smoke-matrix-output.log`.
- 2026-03-03: Se agregaron inputs manuales `smoke_matrix_auth_modes` y `smoke_matrix_locales` para ejecutar `smoke-matrix` parcial desde `workflow_dispatch`.
- 2026-03-04: `smoke:matrix` ahora aplica timeout configurable por comando (`SMOKE_MATRIX_COMMAND_TIMEOUT_MS`, default `180000`) para evitar hangs en CI/local.
- 2026-03-03: Se agregó `tmp/` a `.gitignore` para evitar ruido local por artefactos de `smoke:matrix:json`.
- 2026-03-03: Se documentaron ejemplos de ejecución manual de `auth-smoke` para escenarios de incidente.
- 2026-03-03: Se agregó plantilla de PR con checklist de validación y recordatorio de `auth-smoke` manual.
- 2026-03-03: Se agregó plantilla `.github/CODEOWNERS.example` para ownership de rutas críticas (auth/ops/CI).
- 2026-03-03: Se activó `.github/CODEOWNERS` (con placeholders) para enrutar revisión automática.
- 2026-03-03: Se alineó `.github/CODEOWNERS.example` con owner único actual (`@carlosd2381`).
- 2026-03-03: Se agregó quality gate `quality:codeowners` para validar `.github/CODEOWNERS` sin placeholders.
- 2026-03-03: Se agregó checklist pre-merge en runbook para asegurar `quality:codeowners` en cambios auth/CI.
- 2026-03-03: Se reforzó plantilla de PR con validación explícita `quality:codeowners`.
- 2026-03-04: Se inició Sprint 2 con módulo `itinerary` (dominio/API/validación/repositorios/rutas RBAC) y migración SQL inicial.
- 2026-03-04: Se agregó flujo de aprobación de itinerarios con RBAC y trazabilidad de auditoría para cambios en itinerarios.
- 2026-03-04: Se agregó `itinerary_items` (API+repos+migración) con recálculo automático de `gross/net/markup/profit` en itinerario.
- 2026-03-04: Se agregó módulo `suppliers` v1 (API+validación+repos+RBAC+migración) con cobertura inicial de pruebas de integración.
- 2026-03-04: Se agregó módulo `commissions` v1 (API+validación+repos+RBAC+migración) con cobertura inicial de pruebas de integración.
- 2026-03-04: Se agregó módulo `financials` v1 (API+validación+repos+RBAC+migración) con cobertura inicial de pruebas de integración.
- 2026-03-04: Se agregó módulo `messaging` v1 (API+validación+repos+RBAC+migración) con cobertura inicial de pruebas de integración.
- 2026-03-04: Se agregó módulo `dashboard` v1 (API+validación+repos+RBAC+migración) con cobertura inicial de pruebas de integración.
- 2026-03-04: Se agregó módulo `management` v1 (API+validación+repos+RBAC+migración) con cobertura inicial de pruebas de integración.
- 2026-03-04: Se implementó pipeline AI mock + contrato JSON inicial con endpoint protegido `/ai/proposal` y cobertura de pruebas.
- 2026-03-04: Se agregaron reglas iniciales de auditoría de calidad AI (warnings estructurados) y cobertura de pruebas unitarias/integración.
- 2026-03-04: Se agregaron bloques JSON explícitos por perfil AI para soporte de renderización posterior de propuesta/PDF.
- 2026-03-04: Se agregó versionado del payload AI (`ai-proposal.v1`) y metadata de orden estable de secciones para consumidores downstream.
- 2026-03-04: Se agregó enforcement opcional de quality gate en propuestas AI (`422` con bloqueadores de severidad alta).
- 2026-03-04: Se agregó endpoint de metadata de esquema AI para descubrimiento de capacidades por consumidores (`/ai/schema/proposal`).
- 2026-03-04: Se agregó localización por query param en `/ai/schema/proposal` para documentación de warnings en `es-MX` y `en-US`.
- 2026-03-04: Se agregaron ejemplos de payload en metadata de esquema AI para acelerar integración de frontend/tooling.
- 2026-03-04: Se agregó smoke-check operativo para esquema AI (`ai:schema:smoke`) orientado a verificación rápida en entornos/CI.
- 2026-03-04: Se integró `ai-schema-smoke` al workflow CI de calidad con path filtering y opciones de `workflow_dispatch`.
- 2026-03-04: Se amplió `ai-schema-smoke` para cubrir matriz `AUTH_MODE=header|token` y locale (`es-MX|en-US`) con selector manual `ai_schema_smoke_auth_modes`.
- 2026-03-04: Se endureció `ai:schema:smoke` con validaciones de contrato/localización y configuración explícita de `schemaVersion` esperada en CI.
- 2026-03-04: `ai:schema:smoke` ahora soporta validación en `AUTH_MODE=token` (obtención de bearer vía `/auth/token`) además de header mode.
- 2026-03-04: Se agregaron checks negativos de auth en `ai:schema:smoke` para detectar aperturas accidentales de `/ai/schema/proposal`.
- 2026-03-04: Se agregó check negativo de método inválido en `ai:schema:smoke` para exigir `405` en `POST /ai/schema/proposal`.
- 2026-03-04: Se agregaron aserciones de i18n en `ai:schema:smoke` para mensajes de error (`No autenticado/Unauthenticated`, `Método no permitido/Method not allowed`).
- 2026-03-04: Se agregó aserción de i18n para mensaje de éxito del schema (`Esquema AI disponible/AI schema available`).
