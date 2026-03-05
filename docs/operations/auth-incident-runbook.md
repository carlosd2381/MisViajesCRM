# Auth Incident Runbook

Guía mínima para diagnóstico y contención de incidentes de autenticación/sesión.

## Alcance

Cubre incidentes en:

- JWT access tokens
- refresh sessions (`/auth/refresh`, `/auth/revoke`, `/auth/revoke-all`)
- métricas auth (`/auth/metrics`, `/auth/metrics/prom`)
- exportación OTel de métricas

## Señales comunes

- Picos de `401` o `403` en rutas protegidas.
- Falla masiva de refresh (`Refresh token inválido o expirado`).
- Revocación no efectiva entre instancias (`STORAGE_MODE=memory` en entorno multi-node).
- Métricas auth vacías o sin actualización.

## Triage rápido (5-10 min)

1. Verificar modo auth activo:
   - `AUTH_MODE=header|token`
2. Confirmar configuración JWT:
   - `AUTH_TOKEN_SECRET`
   - `AUTH_JWT_ISSUER`
   - `AUTH_JWT_AUDIENCE`
   - `AUTH_JWT_DEFAULT_KID`
   - `AUTH_JWT_KEYS` (si aplica)
3. Confirmar backend de sesiones:
   - `STORAGE_MODE=postgres` en despliegues multi-instancia.
4. Probar endpoints de salud auth:
   - `POST /auth/token`
   - `POST /auth/refresh`
   - `POST /auth/revoke`
   - `GET /auth/metrics`

Atajo recomendado:

- Ejecutar `npm run auth:smoke` para validar flujo mínimo auth/session/metrics.
- Para validar explícitamente token-mode en ruta protegida: `AUTH_SMOKE_VERIFY_TOKEN_MODE=true npm run auth:smoke`.
- Para validar localización de respuestas: `AUTH_SMOKE_LOCALE=en-US npm run auth:smoke` (o `es-MX`).
- Confirmar que el job CI `auth-smoke` del workflow de calidad también esté pasando.
- En incidente sin cambios de código, lanzar `workflow_dispatch` con `force_auth_smoke=true`, `auth_smoke_modes=token|both` y `auth_smoke_locales=en-US|es-MX|both`.
- Si el incidente involucra persistencia PostgreSQL (revocación compartida o trazabilidad), lanzar también `workflow_dispatch` con `force_postgres_integration=true` para ejecutar `test:integration:postgres` en CI.
- Antes de ese run, confirmar variables `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (y opcional `DB_PORT`) en el entorno del runner; si faltan, el job se marca como `skip` en el summary.
- Variables opcionales para el smoke-check:
   - `AUTH_SMOKE_BASE_URL`
   - `AUTH_SMOKE_AGENT_ID`, `AUTH_SMOKE_AGENT_ROLE`
   - `AUTH_SMOKE_MANAGER_ID`, `AUTH_SMOKE_MANAGER_ROLE`
   - `AUTH_SMOKE_LOCALE`

### Quick triage de summaries (CI)

Referencia canónica: `docs/operations/ci-troubleshooting.md`.

### Quick triage de `postgres-integration` (CI)

Referencia canónica: `docs/operations/ci-troubleshooting.md`.

## Escenario A — falla de validación JWT

Síntoma:

- Todas las requests token-mode responden `401`.

Validaciones:

- Secret correcto para `kid` activo.
- `issuer/audience` alineados entre emisor y verificador.
- Tiempo del servidor sin drift significativo.

Mitigación inmediata:

- Restaurar `AUTH_JWT_DEFAULT_KID` y secreto previo conocido.
- Si hubo rotación incorrecta, reintroducir clave anterior en `AUTH_JWT_KEYS` temporalmente.

## Escenario B — revocación inconsistente entre instancias

Síntoma:

- Un token refrescado/revocado sigue siendo válido en otro nodo.

Validaciones:

- `STORAGE_MODE` actual.
- Conectividad a PostgreSQL si `STORAGE_MODE=postgres`.
- Existencia de tabla `auth_refresh_sessions` (migración `20260303_002_auth_refresh_sessions.sql`).

Mitigación inmediata:

- En multi-node, forzar `STORAGE_MODE=postgres`.
- Ejecutar `POST /auth/revoke-all` para usuarios afectados.

## Escenario C — limpieza de expiradas no ejecuta

Síntoma:

- Crecimiento de sesiones expiradas, métricas de prune en cero prolongado.

Validaciones:

- `AUTH_PRUNE_ENABLED=true`.
- `AUTH_PRUNE_INTERVAL_SECONDS` con valor válido.
- proceso iniciado por `src/server.ts` (no solo `createApiServer` en tests).

Mitigación inmediata:

- Ejecutar `POST /auth/prune` manual (manager/owner).
- Revisar logs de startup y reiniciar proceso si no hay job activo.

## Escenario D — exportación OTel caída

Síntoma:

- Métricas no aparecen en collector/backend.

Validaciones:

- `AUTH_OTEL_SDK_ENABLED=true`.
- `AUTH_OTEL_EXPORTER=otlp`.
- `AUTH_OTEL_OTLP_ENDPOINT` accesible.
- `AUTH_OTEL_OTLP_HEADERS` válidos.

Mitigación inmediata:

- Cambiar temporalmente a `AUTH_OTEL_EXPORTER=console` para no perder visibilidad local.
- Mantener `/auth/metrics` y `/auth/metrics/prom` como fallback interno.

## Comandos/checklist post-incidente

1. Registrar causa raíz y ventana de impacto.
2. Confirmar normalización de `401/403`.
3. Verificar counters en `/auth/metrics` y exposición `/auth/metrics/prom`.
4. Si hubo rotación de claves, documentar fecha y `kid` vigente.
5. Actualizar `docs/planning/build-plan.md` con acciones permanentes.

## Checklist pre-merge (cambios auth/CI/ownership)

Antes de mergear cambios en auth, workflows o ownership:

1. Ejecutar `npm run quality`.
2. Confirmar explícitamente `npm run quality:codeowners` en verde.
3. Si hubo cambio en flujo de revisión, verificar `.github/CODEOWNERS` sin placeholders.

## Hardening recomendado

- Política formal de rotación de `kid` con ventana de convivencia de claves.
- Alertas para tasa de `401` y errores de refresh.
- Dashboard con:
  - `issue.success`
  - `rotate.success/failure`
  - `revoke.success/failure`
  - `pruneExpired.success/failure`
