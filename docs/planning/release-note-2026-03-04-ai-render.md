# Release Note — 2026-03-04 (AI Proposal Render + CI Hardening)

## Resumen de entrega

Se liberó el primer slice de Proposal Experience basado en `ai-proposal.v1` con salida web y borrador PDF, junto con hardening operativo de smoke checks y CI matrix.

## Cambios principales

- Nuevos endpoints protegidos RBAC:
  - `POST /ai/proposal/render/web` → render HTML
  - `POST /ai/proposal/render/pdf` → render PDF draft
- Nuevo servicio de render:
  - `src/modules/ai/application/proposal-render-service.ts`
- Refactor de enrutamiento HTTP:
  - `src/core/http/module-route-dispatcher.ts`
  - `src/app.ts` simplificado (delegación de rutas)
- Cobertura de integración separada:
  - `src/integration/ai-render.integration.test.ts`
  - `src/integration/itinerary-items.integration.test.ts`
- Operación/CI:
  - `tools/ops/ai-render-smoke-check.mjs`
  - `tools/ops/smoke-matrix-check.mjs` ampliado con render smoke
  - `.github/workflows/quality.yml` con `ai-render-smoke` (matriz `header|token` × `es-MX|en-US`)
  - inputs manuales `force_ai_render_smoke`, `ai_render_smoke_auth_modes`, `ai_render_smoke_locales`

## Evidencia de validación

Validaciones ejecutadas en la rama antes del push:

- `npm run quality`
- `npm run typecheck`
- `npm run test`
- `npm run ai:render:smoke`
- `npm run ai:render:smoke:en`

## Commits liberados

- `29becad` — `feat(ai): add proposal web/pdf render endpoints and route dispatcher`
- `4ec41b2` — `chore(ci,docs): add ai render smoke matrix and operational runbooks`

## Riesgo / mitigación

- Riesgo principal: combinación de matriz CI filtrada por step-level guard (`run_combo`) en `quality.yml`.
- Mitigación: ejecución manual de `workflow_dispatch` focalizada por auth mode/locale y verificación de línea summary (`AI_RENDER_SMOKE_SUMMARY`).

## Rollback rápido

1. Revertir commits `4ec41b2` y `29becad` (en ese orden o con revert independiente).
2. Confirmar que desaparecen rutas `/ai/proposal/render/web` y `/ai/proposal/render/pdf`.
3. Ejecutar `npm run quality && npm run typecheck && npm run test`.

## Documentos relacionados

- `docs/planning/pr-handoff-2026-03-04.md`
- `docs/planning/pr-body-2026-03-04.md`
- `docs/planning/build-plan.md`
