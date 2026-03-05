# PR Summary Draft — PostgreSQL Integration Unblock

## Title
fix(postgres): unblock integration with ssl, migrations, and uuid-safe ids

## Context
Local PostgreSQL integration was blocked by three root causes:

1. TLS-required Postgres endpoints rejected insecure clients.
2. Local environments without `psql` had no migration fallback.
3. Lead/client IDs were generated as prefixed strings (`lead_*` / `client_*`) while persisted columns require UUID.

## What changed

### PostgreSQL connectivity (SSL)
- Added env-driven SSL parsing and wiring in runtime pool client.
- Added same SSL support in integration precheck script.

Files:
- `src/core/db/pg-client.ts`
- `tools/ops/postgres-integration-precheck.mjs`

### Migration fallback for local environments
- Added Node-based migration runner to apply SQL files from `db/migrations` when `psql` is unavailable.

File:
- `tools/ops/apply-postgres-migrations.mjs`

### UUID-safe ID generation
- Switched lead/client ID generation to `randomUUID()` to match PostgreSQL UUID column constraints.

Files:
- `src/modules/leads/application/lead-service.ts`
- `src/modules/clients/application/client-service.ts`

### Postgres integration stability and test fixes
- Seeded/ensured actor user for audit persistence tests.
- Removed CFDI UUID collision in confirm flow by using distinct stamp/cancel UUIDs.

File:
- `src/integration/http.postgres.integration.test.ts`

### Management CFDI handler refactor (no contract changes)
- Split large handler module into query/validate/transition files.
- Added CFDI invoice status query route handling.

Files:
- `src/modules/management/api/management-http-handlers.ts`
- `src/modules/management/api/management-cfdi-query-http-handlers.ts`
- `src/modules/management/api/management-cfdi-validate-http-handlers.ts`
- `src/modules/management/api/management-cfdi-transition-http-handlers.ts`
- `src/core/http/module-route-dispatcher.ts`

### Docs
- Added local Postgres template and documented SSL + migration/test flow.

Files:
- `docs/README.md`
- `docs/planning/build-plan.md`

## Validation
Executed locally with env from `.env.postgres.local`:

- `npm run -s typecheck`
- `npm run -s test:integration:postgres`

Observed result:
- `POSTGRES_INTEGRATION_PRECHECK {"ok":true,...}`
- Integration suite: 4 passed, 0 failed.

## Commit
- `844084a` — fix(postgres): unblock integration with ssl, migrations, and uuid-safe ids

## Risk assessment
- Low to medium.
- Main behavior impact is scoped to Postgres runtime/precheck config, ID generation shape, and CFDI handler decomposition.
- No public contract changes intended beyond documented CFDI invoice status query route already wired.

## Rollback
- Revert commit `844084a`.
- If rollback needed only for docs/tooling, cherry-pick selectively from prior commit history.

## Ops quick commands
- Apply migrations: `set -a && source .env.postgres.local && set +a && node tools/ops/apply-postgres-migrations.mjs`
- Precheck: `set -a && source .env.postgres.local && set +a && npm run postgres:integration:precheck`
- Postgres integration tests: `set -a && source .env.postgres.local && set +a && npm run test:integration:postgres`
