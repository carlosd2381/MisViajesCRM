# CI Troubleshooting (Auth/AI/Postgres)

Guía rápida para diagnosticar fallas y `skip` en los jobs del workflow de calidad.

## Señales de summaries (auth/ai)

| Señal en logs | Interpretación rápida | Acción recomendada |
| --- | --- | --- |
| Falta `AUTH_SMOKE_SUMMARY` | El script no terminó flujo esperado o cambió formato | Revisar paso `Run auth smoke check`, confirmar exit code y artifact de logs del job |
| `verifyTokenMode=false` cuando esperabas token | Se ejecutó variante header o variable no aplicada | Revisar matriz/inputs (`auth_smoke_modes`) y variable `AUTH_SMOKE_VERIFY_TOKEN_MODE` |
| `checkedNegativeScenarios` sin `token_mode_unauth_protected_401` en corrida token | Cobertura token negativa no se ejecutó | Confirmar que el job corre con `AUTH_MODE=token` y `AUTH_SMOKE_VERIFY_TOKEN_MODE=true` |
| `locale` distinto al esperado | Se corrió locale incorrecto o sin selector manual | Revisar matriz/inputs (`auth_smoke_locales`) y `AUTH_SMOKE_LOCALE` |
| Falta `AI_SCHEMA_SMOKE_SUMMARY` | El schema smoke no completó validación de contrato | Revisar paso `Run AI schema smoke check` y artifact del job `ai-schema-smoke` |
| Falta `AI_RENDER_SMOKE_SUMMARY` | El render smoke no completó validaciones web/pdf | Revisar paso `Run AI render smoke check` y artifact del job `ai-render-smoke` |

## Señales de `postgres-integration`

| Señal en logs/summary | Interpretación rápida | Acción recomendada |
| --- | --- | --- |
| `Skipped: missing DB_* environment variables` en `GITHUB_STEP_SUMMARY` | Runner sin `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Configurar variables `DB_*` del entorno CI y relanzar con `force_postgres_integration=true` |
| `POSTGRES_INTEGRATION_PRECHECK ... Missing required env vars` | Variables `DB_*` incompletas en runtime | Completar variables requeridas (y `DB_PORT` si aplica), luego reintentar |
| `POSTGRES_INTEGRATION_PRECHECK ... Missing tables` | Esquema de BD sin migraciones necesarias | Aplicar migraciones (`db/migrations/*`) en la BD objetivo y relanzar job |
| Error de conexión (`ECONNREFUSED`/timeout) | Red/host/puerto o credenciales inválidas | Verificar reachability `DB_HOST:DB_PORT`, credenciales y reglas de red del runner |
| Falla de test tras precheck exitoso | Posible regresión funcional real | Revisar `postgres-integration-output.log` o `postgres-nightly-output.log`, reproducir local con `npm run test:integration:postgres` y corregir |

## Atajos operativos

- Ejecutar flujo manual Postgres CI:
  - `gh workflow run quality.yml --ref main -f force_postgres_integration=true`
- Ejecutar flujo nocturno manual (mismo contrato, workflow dedicado):
  - `gh workflow run postgres-nightly.yml --ref main -f force_postgres_integration=true`
- Ejecutar flujo manual vía GitHub UI (cuando no haya `gh` CLI):
  - Actions → `Quality Gates` → `Run workflow` → `force_postgres_integration=true`
  - Validar job `postgres-integration` y revisar `GITHUB_STEP_SUMMARY`.
- Ejecutar validación local Postgres:
  - `npm run test:integration:postgres`
- Ver precondiciones de Postgres local:
  - `npm run postgres:integration:precheck`
