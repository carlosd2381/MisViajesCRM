# Build Plan (Documento Vivo)

Estado: Activo
Última actualización: 2026-03-06

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

## TODO (Próxima sesión)

Referencia de cierre de hoy: `docs/planning/night-handoff-2026-03-05.md`.

### Siguiente (arranque recomendado)

1. [NEXT] Ejecutar `workflow_dispatch` con `force_postgres_integration=true` en un entorno con `DB_*` configuradas y confirmar corrida completa (sin `skip`).
2. [NEXT] Verificar evidencia de CI en `GITHUB_STEP_SUMMARY` + artifact `postgres-integration-output.log` y registrar resultado en este documento.
3. [NEXT] Si falla por esquema, aplicar migraciones pendientes y repetir `test:integration:postgres` hasta verde.
4. [NEXT] Continuar build en paralelo sobre P1-AI (`P1-AI-01`, `P1-AI-02`) sin abrir nuevas features de Fase 1 hasta resolver `P0-DB-01`.

Playbook de cierre de blocker:
- `docs/operations/p0-db-ci-unblock-playbook.md`

### Prioridades inmediatas (próximas 2 semanas)

- [MERGE-BLOCKER] Validación PostgreSQL en CI: no declarar cierre de Fase 1 sin al menos una corrida `postgres-integration` (manual o nocturna) sin `skip` y con evidencia en summary/log.
- [COMPLIANCE-BLOCKER] Preparación CFDI 4.0/SAT adelantada: incluir en roadmap de migraciones entidades técnicas mínimas de facturación fiscal (certificado, sello digital, metadata XML CFDI y validación de esquema).
- [PHASE-2-GATE] AI pipeline real: definir proveedor LLM objetivo (OpenAI/Azure/local), contrato de integración y observabilidad de latencia/costo antes de cerrar Fase 2.
- [ARCH-VALIDATION] Validar límites de dominio `commissions` vs `financials` (ADR breve de separación o unificación) y documentar decisión.
- [ARCH-VALIDATION] Confirmar contrato de contexto `messaging`↔`itinerary` para notificaciones enriquecidas sin acoplamiento circular.
- [DATA-MODEL] Validar timestamp de tipo de cambio por evento (quote/booking) y estrategia de split de comisiones multi-proveedor por itinerario.

Estado rápido (corte 2026-03-05):
- P0-DB-01: completado (corrida forzada `quality.yml` con ejecución real de `test:integration:postgres`, run `22706042466`).
- P0-CFDI-01: en progreso (migración base creada).
- P1-AI-01 / P1-AI-02: pendientes.
- P1-ARCH-01: completado (ADR dominio + contrato de contexto).
- P1-DATA-01: completado (migración FX timestamp/source + split multi-proveedor).

### Mini backlog ejecutable (2 semanas)

| ID | Prioridad | Owner sugerido | Entregable | Evidencia de salida |
| --- | --- | --- | --- | --- |
| P0-DB-01 | Postgres CI merge-blocker | Backend/DevOps | Configurar `DB_*` en Actions y ejecutar corrida forzada sin `skip` | `GITHUB_STEP_SUMMARY` con ejecución real + log `postgres-integration-output.log` o `postgres-nightly-output.log` |
| P0-CFDI-01 | CFDI/SAT base legal-operativa | Backend/Finanzas | Propuesta de migraciones iniciales SAT (certificado, sello, metadata XML CFDI, estado de timbrado) | Entrada de plan + archivo de migración draft en `db/migrations/*` |
| P1-AI-01 | Proveedor LLM real | AI/Backend | ADR corta de proveedor (OpenAI/Azure/local), estrategia de fallback y límites de costo | Documento de decisión + variables de entorno objetivo en docs |
| P1-AI-02 | Observabilidad AI costo/latencia | AI/Observability | Instrumentación mínima por request (latencia, tokens estimados, costo estimado) | Métrica expuesta en endpoint/summary operativo + prueba de contrato |
| P1-ARCH-01 | Límite de dominio commissions/financials | Backend/Arquitectura | ADR de separación o unificación con impacto en entidades/rutas | Decisión documentada y checklist de refactor (si aplica) |
| P1-DATA-01 | FX timestamp + split comisiones | Backend/Finanzas | Diseño de campos y reglas para timestamp de tipo de cambio y split por proveedor | Contrato de datos actualizado + casos de prueba de integración definidos |

Notas de ejecución:
- P0-DB-01 y P0-CFDI-01 se consideran bloqueadores de avance seguro hacia cierre operativo de Fase 1.
- P1-AI-01 y P1-AI-02 deben cerrarse antes del cierre formal de Fase 2 (sin excepción).
- P1-ARCH-01 y P1-DATA-01 deben producir decisiones explícitas antes de ampliar features en `financials/commissions/messaging`.
- Avance P0-CFDI-01: migración draft creada en `db/migrations/20260305_012_cfdi_sat_foundation.sql` y diccionario actualizado.
- Avance P0-CFDI-01: endpoint operativo `GET /management/cfdi/readiness` agregado con cobertura de integración para validar readiness de tablas SAT/CFDI por entorno.
- Avance P0-CFDI-01: contratos/validaciones operativas de timbrado y cancelación CFDI agregadas vía `POST /management/cfdi/stamp/validate` y `POST /management/cfdi/cancel/validate` con cobertura unitaria e integración.
- Avance P0-CFDI-01: persistencia de eventos de validación CFDI en `cfdi_invoice_events` (tipos `validation_passed` / `validation_failed`) integrada en endpoints de timbrado/cancelación y cubierta en `http.postgres.integration.test.ts`.
- Avance P0-CFDI-01: endpoint de trazabilidad `GET /management/cfdi/events?invoiceId=<id>&limit=<n>` agregado para consulta operativa de eventos CFDI (fallback explícito en `memory`, consulta real en `postgres`).
- Avance P0-CFDI-01: endpoints de transición de ciclo de vida `POST /management/cfdi/stamp/confirm` y `POST /management/cfdi/cancel/confirm` agregados para actualizar estado de `cfdi_invoices` (`stamped`/`cancelled`) y registrar eventos `stamped`/`cancelled`.
- Avance P0-CFDI-01: endpoint `GET /management/cfdi/invoices/:invoiceId?limit=<n>` agregado para consultar estado consolidado de CFDI + últimos eventos asociados.
- Avance P0-CFDI-01: refactor de handlers de management/CFDI aplicado en archivos dedicados (`management-cfdi-query-http-handlers.ts`, `management-cfdi-validate-http-handlers.ts`, `management-cfdi-transition-http-handlers.ts`) para cumplir governance de tamaño de archivo sin cambiar contratos HTTP.
- Avance P0-CFDI-01: endpoints operativos de certificados SAT agregados (`GET/POST /management/cfdi/certificates` y `GET /management/cfdi/certificates/:certificateId`) con fallback explícito en `memory` y persistencia real en `postgres`.
- Avance P0-CFDI-01: endpoints de XML CFDI agregados (`POST /management/cfdi/xml/validate` y `POST /management/cfdi/xml/persist`) con validaciones mínimas de estructura (declaración XML + `Comprobante` y `TimbreFiscalDigital` para `stamped`), persistencia en `cfdi_invoices` (`xml_unsigned`/`xml_stamped`) y metadata XML expuesta en `GET /management/cfdi/invoices/:invoiceId`.
- Avance P0-CFDI-01: endpoint de firmado CFDI agregado (`POST /management/cfdi/sign`) con validación de vínculo factura↔certificado SAT (estado activo, RFC emisor y vigencia) y persistencia de `sat_certificate_id`, `cadena_original` y `sello_digital` en `cfdi_invoices`.
- Avance P0-CFDI-01: enforcement de trazabilidad para cancelación CFDI con razón `01` aplicado en `validate/confirm` (requiere `replacementCfdiUuid` existente y en estado `stamped`), con respuesta `409` cuando el CFDI de reemplazo no existe.
- Avance P0-CFDI-01: endpoint de firmado CFDI ahora exige material de firmado en certificado SAT (`private_key_ref` + `passphrase_ref`) y persiste diagnósticos operativos en `cfdi_invoices.last_error` + evento `error` cuando falla el firmado.
- Avance P0-CFDI-01: endpoint operativo `GET /management/cfdi/signing/errors` agregado para observabilidad de fallas de firmado CFDI (filtros por `reason`, `invoiceId`, rango `from/to` y `limit`).
- Avance P1-DATA-01: migración draft creada en `db/migrations/20260305_013_financials_fx_and_commission_splits.sql` (timestamp/fuente FX y split multi-proveedor) y diccionario actualizado.
- Avance P1-ARCH-01: ADR aprobada en `docs/governance/adr-2026-03-05-commissions-vs-financials.md` (se mantiene separación de dominio `commissions`/`financials`).
- Avance P1-ARCH-01: contrato de contexto `messaging`↔`itinerary` definido en `docs/governance/adr-2026-03-05-messaging-itinerary-context-contract.md`.
- Avance P1-AI-01: ADR de proveedor y fallback definida en `docs/governance/adr-2026-03-05-ai-provider-strategy.md`.
- Avance P1-AI-02: observabilidad base implementada (`GET /ai/metrics`) y guía operativa en `docs/operations/ai-observability-baseline.md`.

### Checklist de ejecución diaria (Día 1–10)

| Día | Objetivo | Resultado esperado |
| --- | --- | --- |
| Día 1 | Configurar/validar `DB_*` en GitHub Actions para entorno objetivo | Variables disponibles y checklist de acceso de runner confirmado |
| Día 2 | Ejecutar `quality.yml` con `force_postgres_integration=true` y capturar evidencia | Corrida sin `skip` documentada en summary/log |
| Día 3 | Definir alcance técnico SAT/CFDI y entidades mínimas | Lista de entidades/campos y dependencias legales priorizadas |
| Día 4 | Crear draft de migraciones SAT/CFDI (`certificado/sello/xml`) | Archivo(s) de migración inicial en `db/migrations/*` |
| Día 5 | Decidir proveedor LLM (ADR corta con riesgos/costos) | Decisión documentada + estrategia fallback |
| Día 6 | Instrumentar telemetría base AI (latencia/costo/tokens estimados) | Métricas disponibles en entorno de integración |
| Día 7 | Definir frontera de dominio `commissions` vs `financials` | ADR aprobada con impacto en modelo/rutas |
| Día 8 | Diseñar contrato `messaging`↔`itinerary` sin acoplamiento circular | Contrato de contexto y eventos/campos acordados |
| Día 9 | Diseñar timestamp FX y split de comisiones multi-proveedor | Reglas de negocio + campos de datos definidos |
| Día 10 | Consolidar evidencia y revalidar gates (`quality/typecheck/test`) | Baseline verde + actualización de estado en este documento |

Definition of done (2 semanas):
- Se cierra P0-DB-01 y P0-CFDI-01 con evidencia verificable en CI/roadmap.
- Se cierran P1-AI-01 y P1-AI-02 con proveedor y observabilidad operativa mínima.
- Se cierran P1-ARCH-01 y P1-DATA-01 con decisiones documentadas y checklist de implementación.

Plantilla operativa recomendada para seguimiento diario:
- `docs/planning/daily-checkin-template.md`

Seguimiento activo:
- Día 1 (2026-03-05): `docs/planning/daily-checkin-2026-03-05-day1.md`
- Día 2 draft (2026-03-06): `docs/planning/daily-checkin-2026-03-06-day2-draft.md`

### Otros ítems en cola

- [DONE] Agregar checklist breve de “Postgres CI readiness” en `docs/governance/project-constraints.md` para fijar requisito operativo.
- [DONE] Considerar job nocturno/cron (opcional) para `test:integration:postgres` en rama principal con alertado temprano.
- [DONE] Evaluar ampliar cobertura Postgres de auditoría a más acciones críticas de `leads` (además de `lead.convert`).
- [DONE] Consolidar tabla única de troubleshooting CI (auth/ai/postgres) para reducir duplicación entre `docs/README.md` y runbooks.
- [DONE] Definir criterio de salida de este bloque: `postgres-integration` estable en CI + documentación operativa cerrada.

### Criterio de salida (bloque Postgres integration)

- `postgres-integration` ejecuta en CI sin `skip` (manual forzado o nocturno) con `DB_*` configuradas.
- Evidencia publicada en `GITHUB_STEP_SUMMARY` y log adjunto cuando aplique (`postgres-integration-output.log` o `postgres-nightly-output.log`).
- Prueba de integración Postgres de auditoría de `leads` cubre `lead.create`, `lead.update` y `lead.convert`.
- Runbook/README/gobernanza referencian la ruta de diagnóstico única `docs/operations/ci-troubleshooting.md`.

### Bloqueadores conocidos

- [RESOLVED] Confirmación final de `postgres-integration` validada en CI con `DB_*` configuradas y step de test ejecutado.
- [BLOCKED-BY-COMPLIANCE] No declarar completada capacidad operativa financiera México sin plan técnico activo de CFDI 4.0/SAT.

### Criterios de salida adicionales (insumos 2026-03-05)

- Postgres CI: al menos una corrida `postgres-integration` sin `skip` en `quality.yml` o `postgres-nightly.yml`.
- SAT/CFDI: backlog de migraciones inicial definido y priorizado (entidades de certificado/sello/XML).
- AI real: proveedor seleccionado + métricas base de costo/latencia instrumentadas en entorno de integración.
- Arquitectura: decisión documentada para `commissions`/`financials` y contrato de contexto `messaging`/`itinerary`.

## Mantenimiento del documento

Actualizar este archivo cuando cambie cualquiera de estos puntos:

- Prioridad de módulos
- Secuencia de fases
- Definición de entregables
- Riesgos y dependencias críticas

## Registro de cambios

Nota de lectura: entradas con `[Resumen]` agrupan lotes de cambios relacionados para escaneo rápido; los bullets detallados que siguen conservan el historial completo y son la referencia operativa principal.

- 2026-03-04: [Resumen] Bloque de endurecimiento CI/contratos completado: preflight `smoke:matrix:contract`, validadores runtime de summaries (`AUTH/AI_SCHEMA/AI_RENDER`), publicación en `GITHUB_STEP_SUMMARY` y pruebas de regresión de workflow.
- 2026-03-05: Se agregó playbook operativo `docs/operations/p0-db-ci-unblock-playbook.md` para cierre paso-a-paso de `P0-DB-01` (verificación remota, ejecución forzada, evidencia y remediación).
- 2026-03-05: Se creó handoff de cierre `docs/planning/night-handoff-2026-03-05.md` con estado final, evidencia CI y arranque recomendado para continuidad del día siguiente.
- 2026-03-05: Se agregó endpoint de readiness CFDI/SAT `GET /management/cfdi/readiness` (modo `postgres`: valida tablas `sat_certificates`, `cfdi_invoices`, `cfdi_invoice_events`; modo `memory`: retorna estado no listo explícito) con cobertura en `src/integration/management.integration.test.ts`.
- 2026-03-05: Se agregaron contratos de validación para CFDI timbrado/cancelación (`POST /management/cfdi/stamp/validate`, `POST /management/cfdi/cancel/validate`) con reglas de RFC/UUID/fecha/razón de cancelación y cobertura en `management-validation.test.ts` + `management.integration.test.ts`.
- 2026-03-05: Se agregó trazabilidad operativa de validación CFDI en PostgreSQL (`cfdi_invoice_events`) desde endpoints de timbrado/cancelación, incluyendo registro de éxito/error (`validation_passed`/`validation_failed`) y cobertura en pruebas de integración PostgreSQL.
- 2026-03-05: Se agregó endpoint de lectura de eventos CFDI (`GET /management/cfdi/events`) para observabilidad operativa por `invoiceId`, con cobertura de integración en modo `memory` y aserción de lectura en suite PostgreSQL.
- 2026-03-05: Se agregaron endpoints de confirmación de transición CFDI (`stamp/confirm`, `cancel/confirm`) con validaciones de contrato y persistencia en PostgreSQL de estado + eventos de ciclo de vida.
- 2026-03-05: Se corrigió `quality.yml` para inyectar `DB_*`/`DB_SSL` desde secrets/vars en job `postgres-integration` (antes no se exportaban y el test quedaba en `skipped`).
- 2026-03-05: Se validó cierre de `P0-DB-01` con run forzado `quality.yml` `22706042466`, donde el step `Run Postgres integration test` ejecutó en `success`.
- 2026-03-05: Se publicó a `main` el lote de cambios de CI/docs/código (incluyendo `quality.yml` con `force_postgres_integration` y workflow `postgres-nightly.yml`) para habilitar validación remota real de Postgres.
- 2026-03-05: `postgres:ci:readiness` quedó en `ready:true` (`hasForceInput:true`, `hasPostgresJob:true`, `hasNightlyWorkflow:true`) en `carlosd2381/MisViajesCRM`.
- 2026-03-05: Se ejecutó corrida forzada `quality.yml` (`run 22704466009`) y el job `postgres-integration` terminó `success`, pero con step `Run Postgres integration test` en `skipped`; el blocker `P0-DB-01` permanece abierto por configuración faltante de `DB_*` en runner.
- 2026-03-05: Verificación con `gh secret list` y `gh variable list` en el repo objetivo devolvió `no secrets found` / `no variables found`; falta alta de `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` para ejecutar Postgres CI sin `skip`.
- 2026-03-05: Se identificó bloqueo operativo adicional para `P0-DB-01`: workflow remoto `quality.yml` en `main` todavía no incluye input/job de Postgres; se requiere publicar esos cambios antes de ejecutar validación CI sin `skip`.
- 2026-03-05: Se documentó fallback operativo para cierre de `P0-DB-01` cuando no exista `gh` CLI local (disparo manual desde GitHub UI de `Quality Gates` con `force_postgres_integration=true`).
- 2026-03-05: Se implementó observabilidad base AI con endpoint `GET /ai/metrics` (latencia/errores/quality-gate/tokens/costo estimado por operación) y cobertura de pruebas.
- 2026-03-05: Se aprobó ADR `adr-2026-03-05-ai-provider-strategy.md` con estrategia de proveedor LLM (`azure-openai` primario, `openai` fallback, `mock` contingencia).
- 2026-03-05: Se agregó item explícito de continuidad de build en TODO de arranque (`continuar build sobre P1-AI` condicionado a no desbloquear nuevas features de Fase 1 hasta cerrar `P0-DB-01`).
- 2026-03-05: Se aprobó ADR `adr-2026-03-05-messaging-itinerary-context-contract.md` para definir contrato de contexto `messaging`↔`itinerary` sin acoplamiento circular (snapshot v1 + eventos de integración).
- 2026-03-05: Se aprobó ADR `adr-2026-03-05-commissions-vs-financials.md` para fijar frontera de dominio entre `commissions` (regla comercial) y `financials` (ledger contable).
- 2026-03-05: Se agregó migración `20260305_013_financials_fx_and_commission_splits.sql` para P1-DATA-01 (timestamp/fuente de tipo de cambio en `financial_transactions` + `itinerary_commission_splits` para comisiones multi-proveedor).
- 2026-03-05: Se agregó migración base SAT/CFDI `20260305_012_cfdi_sat_foundation.sql` (certificados, CFDI y eventos) y se actualizó diccionario de datos como avance de P0-CFDI-01.
- 2026-03-05: Se creó borrador de Día 2 `docs/planning/daily-checkin-2026-03-06-day2-draft.md` orientado a cerrar P0-DB-01 (Postgres CI sin `skip`) con comandos, evidencia requerida y fallback.
- 2026-03-05: Se creó check-in real de ejecución `docs/planning/daily-checkin-2026-03-05-day1.md` y se enlazó como seguimiento activo en este plan.
- 2026-03-05: Se agregó plantilla `docs/planning/daily-checkin-template.md` para seguimiento diario (objetivo, evidencia, bloqueadores, calidad y plan siguiente) del plan de 2 semanas.
- 2026-03-05: Se agregó checklist operativo Día 1–10 para ejecutar el mini backlog (P0/P1) con objetivos diarios y criterios de Definition of Done.
- 2026-03-05: Se agregó mini backlog ejecutable de 2 semanas (IDs P0/P1) con owner sugerido, entregable y evidencia de salida para Postgres CI, CFDI/SAT, AI real/observabilidad y validaciones de arquitectura/modelo de datos.
- 2026-03-05: Se incorporaron prioridades inmediatas al roadmap (Postgres CI como merge-blocker, adelanto CFDI/SAT, gate de proveedor LLM con observabilidad, y validaciones de acoplamiento/modelo de datos para arquitectura).
- 2026-03-05: Se dividió `src/integration/http.integration.test.ts` en suites especializadas (`http.integration`, `lead-convert.integration`, `lead-convert-auth.integration`) para eliminar violación hard-cap de tamaño y mantener cobertura de integración.
- 2026-03-05: Se agregó cobertura de regresión para `postgres-nightly.yml` en `tools/quality/check-workflow-yaml.test.mjs` y se documentó ejecución manual/triage del workflow nocturno en `docs/README.md` y `docs/operations/ci-troubleshooting.md`.
- 2026-03-05: Se definió criterio de salida del bloque Postgres integration (señales de éxito CI, evidencia requerida, cobertura mínima y documentación canónica).
- 2026-03-05: Se agregó workflow dedicado `postgres-nightly.yml` con trigger `schedule` + `workflow_dispatch` para ejecutar `test:integration:postgres` con gating de `DB_*`, summary operativo y artifact de falla.
- 2026-03-05: Se amplió cobertura Postgres de auditoría para `leads` con prueba de integración de persistencia en `audit_events` para acciones `lead.create` y `lead.update` (incluyendo verificación de actor y snapshots `before/after`).
- 2026-03-04: Se creó handoff nocturno `docs/planning/night-handoff-2026-03-04.md` con arranque rápido y criterio de primer éxito para la próxima sesión.
- 2026-03-04: Se actualizó sección `TODO (Próxima sesión)` a formato tablero con estados (`NEXT/DONE/PENDING/BLOCKED-BY-ENV`) para continuidad de trabajo entre sesiones.
- 2026-03-04: Se consolidó triage de CI en `docs/operations/ci-troubleshooting.md` (auth/ai/postgres) y se reemplazaron tablas duplicadas en `docs/README.md` y `auth-incident-runbook` por referencia canónica.
- 2026-03-04: Se agregó sección de gobernanza “Postgres CI Readiness” en `project-constraints.md` con checklist operativo para ejecución/evidencia de `postgres-integration`.
- 2026-03-04: Se añadió quick triage de `postgres-integration` en `auth-incident-runbook` con señales de `skip/fail`, interpretación y acciones recomendadas para respuesta operativa.
- 2026-03-04: Se agregó tabla de troubleshooting rápido para `postgres-integration` en `docs/README.md` (señales de `skip/fail`, causas probables y acciones recomendadas).
- 2026-03-04: Se agregó ejemplo copy/paste de payload `workflow_dispatch` para `force_postgres_integration=true` (incluyendo comando `gh workflow run`) en `docs/README.md` para acelerar ejecuciones manuales de CI.
- 2026-03-04: Se extendió `.github/pull_request_template.md` con checklist de `postgres-integration` (`force_postgres_integration=true`) y verificación de variables `DB_*` para reducir falsos negativos por ejecución con `skip`.
- 2026-03-04: Se documentó guía operativa para ejecutar `postgres-integration` por `workflow_dispatch` (`force_postgres_integration=true`) y prerequisitos de variables `DB_*` en `docs/README.md` y `auth-incident-runbook`.
- 2026-03-04: Workflow `quality.yml` ahora incluye job `postgres-integration` (trigger por paths/manual `force_postgres_integration`) para ejecutar `test:integration:postgres`, con gating por disponibilidad de variables `DB_*` y resumen operativo en `GITHUB_STEP_SUMMARY`.
- 2026-03-04: Se agregó precheck operativo `postgres:integration:precheck` (env + tablas requeridas) y script dedicado `test:integration:postgres` para ejecutar cobertura de integración PostgreSQL con validación previa de migraciones.
- 2026-03-04: Se agregó prueba de integración PostgreSQL para verificar persistencia de auditoría `lead.convert` en `audit_events` (incluyendo `actor_user_id` y vínculo `leadId` en snapshot `after`).
- 2026-03-04: Se agregaron aserciones de localización (`es-MX`/`en-US`) para guardas de auth en `POST /leads/:id/convert`, validando mensajes `401` y `403` además del status code.
- 2026-03-04: Se agregó cobertura de integración para guardas de auth en `POST /leads/:id/convert` (`401` no autenticado y `403` rol sin permiso), reforzando contrato RBAC del subrecurso de conversión.
- 2026-03-04: Se agregó trazabilidad de auditoría para `leads` en acciones `create`, `update` y `convert` (con snapshots `before/after` en conversión Lead→Cliente cuando `STORAGE_MODE=postgres`).
- 2026-03-04: Se agregó cobertura de integración para payload inválido en `POST /leads/:id/convert` bajo `AUTH_MODE=token` con locale `en-US` (`400` + mensaje localizado + `errors[]` no vacío).
- 2026-03-04: Se agregó paridad de integración en `AUTH_MODE=token` para payload inválido en `POST /leads/:id/convert` (`400` + mensaje localizado + `errors[]` no vacío).
- 2026-03-04: Se agregó prueba de integración para payload inválido en `POST /leads/:id/convert` exigiendo `400`, mensaje localizado y `errors[]` no vacío, alineada con endurecimiento de `auth:smoke`.
- 2026-03-04: Se endureció `auth:smoke` para exigir además `errors[]` no vacío en payload inválido de conversión (`/leads/:id/convert`), extendiendo contrato `AUTH_SMOKE_SUMMARY.checkedLeadConversion.invalidPayloadErrorsArray` y sus pruebas/fixtures.
- 2026-03-04: `auth:smoke` ahora valida también payload inválido en `POST /leads/:id/convert` (`400` + mensaje localizado) y se extendió contrato `AUTH_SMOKE_SUMMARY.checkedLeadConversion.invalidPayload400` con cobertura de tests/fixtures.
- 2026-03-04: Se agregó regresión en `tools/ops/ci-smoke-summary.test.mjs` para asegurar que `GITHUB_STEP_SUMMARY` preserve `checkedLeadConversion` dentro de `AUTH_SMOKE_SUMMARY` parseado.
- 2026-03-04: `auth:smoke` ahora cubre conversión `Lead→Cliente` (éxito `201` + conflicto duplicado `409`) en `header|token`; contrato `AUTH_SMOKE_SUMMARY` y tests de contrato actualizados con `checkedLeadConversion`.
- 2026-03-04: Se agregó cobertura de integración en modo `AUTH_MODE=token` para conversión `Lead→Cliente`, incluyendo camino exitoso (`201`) y conflicto por duplicado (`409`).
- 2026-03-04: Se agregaron aserciones de localización para conflicto de conversión `Lead→Cliente` (`409`) en integración, cubriendo mensajes `es-MX` y `en-US`.
- 2026-03-04: Se endureció la conversión `Lead→Cliente` con guard de conflicto (`409`) cuando el lead ya fue convertido, más índice único parcial en PostgreSQL para `clients.lead_id` no nulo.
- 2026-03-04: Se agregó flujo de conversión `Lead→Cliente` con endpoint `POST /leads/:id/convert`, cierre automático del lead a `closed_won` y traspaso de contexto comercial a `travelPreferences` del cliente.

- 2026-03-04: Se refactorizó `tools/quality/check-workflow-yaml.test.mjs` con helpers compartidos de assertions para pasos/orden (`assertStepExists`, `assertStepOrder`) manteniendo la misma cobertura de regresión.
- 2026-03-04: Se reforzó prueba de regresión de workflow para exigir orden en `quality.yml`: `Run smoke contract preflight` debe ejecutarse antes de `Run quality checks`.
- 2026-03-04: Se agregó prueba de regresión en `tools/quality/check-workflow-yaml.test.mjs` para asegurar que `quality.yml` conserve los pasos `Run smoke contract preflight` y `Smoke contract preflight summary`.
- 2026-03-04: Job `quality` ahora publica en `GITHUB_STEP_SUMMARY` el `SMOKE_MATRIX_SUMMARY` del preflight `smoke:matrix:contract` usando `ci-smoke-summary.sh` para visibilidad rápida en CI.
- 2026-03-04: Workflow de calidad (`quality.yml`) ahora ejecuta `npm run smoke:matrix:contract` como preflight temprano en job `quality` para detectar drift de contratos de summary antes de los smoke jobs completos.
- 2026-03-04: Se agregó modo `contract-only` en `smoke:matrix` para preflight rápido de contratos `AUTH/AI_SCHEMA/AI_RENDER` sin levantar API ni ejecutar smoke scripts, con alias `npm run smoke:matrix:contract` y pruebas en `tools/ops`.
- 2026-03-04: `smoke:matrix` ahora valida también en runtime el contrato de `AUTH_SMOKE_SUMMARY` (locale válido, `verifyTokenMode` boolean y negativos requeridos, incluyendo escenario token cuando aplique), con pruebas de contrato en `tools/ops`.
- 2026-03-04: `smoke:matrix` ahora valida también en runtime el contrato de `AI_SCHEMA_SMOKE_SUMMARY` (schemaVersion esperado, warningsCatalogCount positivo y orden estable de secciones), con validador compartido y pruebas de contrato en `tools/ops`.
- 2026-03-04: `smoke:matrix` ahora valida en runtime el contrato de `AI_RENDER_SMOKE_SUMMARY` y falla temprano si faltan checks requeridos (incluyendo `invalid_render_options_400_web|pdf`), con validador compartido y pruebas dedicadas.
- 2026-03-04: Se agregaron pruebas de contrato en `tools/ops` para fijar claves requeridas de `AI_RENDER_SMOKE_SUMMARY` (incluyendo `invalid_render_options_400_web|pdf`) consumidas por `smoke:matrix` y utilidades de parse en CI.
- 2026-03-04: `ai:render:smoke` ahora valida también payload inválido de `renderOptions` en `render/web` y `render/pdf` (`400` + mensaje localizado + detalle de error), reforzando detección temprana en CI.
- 2026-03-04: Se endureció contrato de transporte en render AI con pruebas de integración negativas para `renderOptions` inválido en `POST /ai/proposal/render/web` y `POST /ai/proposal/render/pdf` (respuesta `400` + errores de campo).
- 2026-03-04: Metadata de render AI (`/ai/proposal/render/schema`) ahora expone capacidades explícitas de `renderOptions` por endpoint (`web`/`pdf`: `supported` + `defaults`) y se reforzó `ai:render:smoke` para validar ese contrato.
- 2026-03-04: Proposal Experience PDF render ahora también aplica `renderOptions` (`includeWarnings`, `compactMode`) en `POST /ai/proposal/render/pdf`, alineado con web render y cubierto con pruebas unitarias/integración.
- 2026-03-04: Proposal Experience web render ahora soporta `renderOptions` (`includeWarnings`, `compactMode`) en `POST /ai/proposal/render/web`, con validación de contrato, metadata de ejemplo actualizada y cobertura unitaria/integración.
- 2026-03-04: Se agregó endpoint de metadata de render AI `GET /ai/proposal/render/schema` (i18n `es-MX|en-US`) con contrato explícito `ai-proposal-render.v1` y cobertura unitaria/integración.
- 2026-03-04: Se localizó render de Proposal Experience (web+pdf) para `es-MX|en-US` en labels estructurales (`schema/generated/profile/checks/warnings`) y se agregó cobertura unitaria de contrato para `proposal-render-service`.
- 2026-03-04: Se extrajo acción compuesta local `.github/actions/setup-node-ci` para unificar `setup-node` + `npm ci` en jobs de `quality.yml`.
- 2026-03-04: Se unificó `API_BASE_URL` por job smoke en `quality.yml` para eliminar literales repetidos de `http://127.0.0.1:3000` y reducir drift de configuración.
- 2026-03-04: Se migró instalación de dependencias en jobs de `quality.yml` de `npm install` a `npm ci` para mayor reproducibilidad en CI.
- 2026-03-04: Se normalizó convención de nombres de logs/pid/artifacts en jobs smoke de `quality.yml` usando variables `env` por job para reducir duplicación y drift.
- 2026-03-04: Se hicieron portables `test:ops` y `test:quality` en `package.json` usando `find` (en lugar de glob `**`) para evitar diferencias de expansión shell entre macOS/zsh y CI Linux/bash.
- 2026-03-04: Se corrigió orden de pasos en jobs smoke de `quality.yml` para ejecutar `checkout` antes de `ci-matrix-scope.sh`, evitando fallas `127` por script no disponible en runner.
- 2026-03-04: Se revirtió uso de `.github/actions/setup-node-deps` en `quality.yml` para recuperar estabilidad en GitHub Actions, manteniendo setup/install explícito por job.
- 2026-03-04: Se extrajo acción compuesta local para publicación de artifacts en CI (`.github/actions/upload-artifact`) y se migraron jobs smoke para usarla.
- 2026-03-04: Se extrajo acción compuesta local para bootstrap de Node en CI (`.github/actions/setup-node-deps`) y se migraron jobs de `quality` y smoke para usarla.
- 2026-03-04: Se extrajo helper de summary para jobs smoke en CI (`tools/ops/ci-smoke-summary.sh`) y se aplicó a `auth-smoke`, `ai-schema-smoke`, `ai-render-smoke` y `smoke-matrix`.
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
- 2026-03-03: [Resumen] Bloque auth/OTel y operación de smoke completado: sesiones JWT (refresh/revoke), métricas (JSON+Prometheus+OTel), runbooks/templates y smoke-checks auth/schema con cobertura CI.
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
