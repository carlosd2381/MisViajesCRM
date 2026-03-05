# P0-DB-01 Unblock Playbook (CI Postgres)

Objetivo: ejecutar `postgres-integration` en GitHub Actions sin `skip` y registrar evidencia para cerrar el blocker.

## Prerrequisitos

1. Cambios de workflow publicados en `main`:
   - `.github/workflows/quality.yml` con input `force_postgres_integration` y job `postgres-integration`
   - `.github/workflows/postgres-nightly.yml`
2. Secrets/vars de Actions configurados:
   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - opcional: `DB_PORT`, `DB_SSL`
3. Esquema DB con migraciones aplicadas.

## Paso 1 — Verificar workflow remoto

Chequeo automatizado recomendado:

- `npm run postgres:ci:readiness`

Con `gh`:

- `gh workflow view quality.yml --yaml | grep -n "force_postgres_integration|postgres-integration"`

Esperado: aparecen input y job en la definición remota.

## Paso 2 — Ejecutar corrida forzada

Con `gh`:

- `gh workflow run quality.yml --ref main -f force_postgres_integration=true`

Alternativa UI:

- Actions → `Quality Gates` → `Run workflow` → `force_postgres_integration=true`

## Paso 3 — Esperar resultado

Con `gh`:

- `gh run list --workflow quality.yml --limit 1`
- `gh run watch <run-id>`

## Paso 4 — Validar evidencia de cierre

Checklist de éxito:

- No aparece `Skipped: missing DB_* environment variables` en `GITHUB_STEP_SUMMARY`.
- Job `postgres-integration` ejecuta `npm run test:integration:postgres`.
- Existe evidencia de logs (`postgres-integration-output.log` en caso de falla, o salida de ejecución en run).

## Paso 5 — Si falla

- Error de env: completar `DB_*` y repetir.
- Error de esquema: aplicar migraciones y repetir.
- Error funcional: revisar `postgres-integration-output.log`, reproducir local con `npm run test:integration:postgres` y corregir.

## Registro obligatorio

Actualizar:

- `docs/planning/build-plan.md` (estado de `P0-DB-01` y changelog)
- `docs/planning/daily-checkin-2026-03-06-day2-draft.md` (resultado real del día)
