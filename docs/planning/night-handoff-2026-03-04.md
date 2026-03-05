# Night Handoff — 2026-03-04

Estado al cierre:

- Quality docs/workflows: verde.
- Bloque Leads/Clientes (conversión + hardening + i18n + smoke + CI): completado en esta sesión.
- `postgres-integration` ya está cableado en CI y documentado; falta confirmar una corrida real sin `skip` en entorno con `DB_*`.

## Arranque rápido (mañana)

1. Abrir `docs/planning/build-plan.md` en sección `TODO (Próxima sesión)`.
2. Lanzar workflow manual:
   - `gh workflow run quality.yml --ref main -f force_postgres_integration=true`
3. Si se requiere prueba local previa:
   - `npm run postgres:integration:precheck`
   - `npm run test:integration:postgres`
4. Revisar evidencia de CI:
   - `GITHUB_STEP_SUMMARY`
   - `postgres-integration-output.log` (artifact/job log)
5. Registrar resultado en `docs/planning/build-plan.md`.

## Primer objetivo de éxito

- Tener una ejecución de `postgres-integration` sin `skip`, con precheck y test pasando en CI.

## Si falla (ruta corta)

- Missing env vars: configurar `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (`DB_PORT` opcional).
- Missing tables: aplicar `db/migrations/*`.
- Connectivity: validar reachability `DB_HOST:DB_PORT` y credenciales.
- Referencia canónica: `docs/operations/ci-troubleshooting.md`.
