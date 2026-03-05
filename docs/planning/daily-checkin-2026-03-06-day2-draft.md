# Daily Check-in — Día 2 (Draft)

Fecha: 2026-03-06  
Owner: Backend/DevOps  
Día de plan: Día 2 (1-10)

## 1) Objetivo del día

- Prioridad principal (P0/P1): P0-DB-01 (Postgres CI merge-blocker).
- Resultado esperado hoy: corrida `postgres-integration` ejecutada sin `skip` y evidencia registrada para destrabar cierre de Fase 1.

## 2) Ejecución (plan)

- Tareas objetivo:
  - [ ] Verificar acceso para configurar `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` en GitHub Actions.
  - [ ] Confirmar conectividad y credenciales de la base usada por runner CI.
  - [ ] Ejecutar workflow `quality.yml` con `force_postgres_integration=true`.
  - [ ] Si aplica, ejecutar también `postgres-nightly.yml` de forma manual para validar ruta alterna.
  - [ ] Documentar resultado de ejecución y bloqueadores en este check-in.

## 3) Comandos operativos sugeridos

Referencia operativa completa:
- `docs/operations/p0-db-ci-unblock-playbook.md`

- Disparo manual de quality:
  - gh workflow run quality.yml --ref main -f force_postgres_integration=true
- Disparo manual de nightly:
  - gh workflow run postgres-nightly.yml --ref main -f force_postgres_integration=true
- Precheck local (si hay acceso DB):
  - npm run postgres:integration:precheck
- Suite local (si hay acceso DB):
  - npm run test:integration:postgres

Si no hay `gh` CLI disponible en máquina local:

1. Ir a GitHub → Actions → workflow `Quality Gates`.
2. Click `Run workflow` sobre rama `main`.
3. Activar input `force_postgres_integration=true`.
4. Ejecutar y verificar job `postgres-integration`.
5. Confirmar que el summary no muestre `Skipped: missing DB_* environment variables`.

## 4) Evidencia requerida para cerrar P0-DB-01

- `GITHUB_STEP_SUMMARY` con ejecución real (no `Skipped: missing DB_*`).
- Log/artefacto de salida: `postgres-integration-output.log` o `postgres-nightly-output.log`.
- Registro de estado actualizado en `docs/planning/build-plan.md` y en este check-in.

## 5) Riesgos y fallback

- Riesgo principal: falta de permisos para secrets/vars o conectividad DB desde runner.
- Riesgo adicional detectado: workflow remoto `quality.yml` en `main` aún no expone input `force_postgres_integration` ni job `postgres-integration`.
- Fallback 1: ejecutar contra entorno CI alterno con DB accesible y variables completas.
- Fallback 2: evidenciar bloqueo con owner/ETA, sin abrir nuevas features de Fase 1.
- Fallback 3: si no hay `gh` en la estación local, usar disparo manual desde GitHub UI (pasos arriba).

Prerequisito de ejecución real:
- Publicar en `main` los cambios de workflow (`quality.yml` y/o `postgres-nightly.yml`) que incluyen job/input de Postgres; sin esto no se puede disparar la validación CI requerida.

Evidencia técnica más reciente (2026-03-05):
- `npm run postgres:ci:readiness`
- Resultado: `POSTGRES_CI_READINESS_SUMMARY {"ready":false,"repository":"carlosd2381/MisViajesCRM","qualityWorkflow":{"hasForceInput":false,"hasPostgresJob":false},"hasNightlyWorkflow":false}`
- Implicación: primero publicar workflows en `main`; luego ejecutar corrida forzada.

## 6) Criterio de éxito del día

- [ ] Al menos una corrida de `postgres-integration` ejecutada sin `skip`.
- [ ] Evidencia archivada (summary + log).
- [ ] Estado de merge-blocker actualizado a resuelto o con bloqueo explícito y ETA.

Nota de contexto:
- P0-CFDI-01 y P1-ARCH/P1-DATA ya tienen entregables iniciales documentados; Día 2 se enfoca en cerrar el bloqueo de infraestructura CI (DB_*).
- P1-AI-01/P1-AI-02 ya cuentan con ADR y baseline operativa (`/ai/metrics`), por lo que no desplazan la prioridad de cierre de `P0-DB-01`.
