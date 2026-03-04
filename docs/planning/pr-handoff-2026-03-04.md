# PR Handoff — 2026-03-04

## Summary

- Added Proposal Experience render endpoints from `ai-proposal.v1` with `POST /ai/proposal/render/web` (HTML) and `POST /ai/proposal/render/pdf` (draft PDF).
- Added dedicated AI render smoke-check (`ai:render:smoke`) with CI matrix coverage (`header|token` × `es-MX|en-US`) and operational summary line `AI_RENDER_SMOKE_SUMMARY`.
- Refactored HTTP routing by extracting module dispatch from `src/app.ts` to `src/core/http/module-route-dispatcher.ts` to reduce file/function size and keep behavior unchanged.
- Split oversized integration files into `src/integration/ai-render.integration.test.ts` and `src/integration/itinerary-items.integration.test.ts` to clear soft file-size warnings.
- Updated governance/ops docs and build plan changelog for CI controls, runbook triage, and completed stabilization sweep.

## Scope

- [x] Backend/API
- [x] Auth/JWT/Sessions
- [x] Observability/CI
- [x] Docs only

## Validation

- [x] `npm run test`
- [x] `npm run typecheck`
- [x] `npm run quality`
- [x] `npm run quality:codeowners` (included in `npm run quality`)

## Docs and Governance

- [x] Updated `docs/planning/build-plan.md` (status + changelog)
- [ ] Updated `docs/data/data-dictionary.md` (not required; no schema/entity change)
- [x] Updated operational docs (`docs/README.md`, `docs/operations/auth-incident-runbook.md`)

## Auth/CI Checklist

- [x] Considered manual `workflow_dispatch` for auth smoke (`force_auth_smoke=true`)
- [x] Considered `auth_smoke_modes` (`header`, `token`, `both`)
- [x] Considered `auth_smoke_locales` (`es-MX`, `en-US`, `both`)
- [x] Considered manual `workflow_dispatch` for AI schema smoke (`force_ai_schema_smoke=true`)
- [x] Considered `ai_schema_smoke_auth_modes` (`header`, `token`, `both`)
- [x] Considered `ai_schema_smoke_locales` (`es-MX`, `en-US`, `both`)
- [x] Added manual `workflow_dispatch` controls for AI render smoke (`force_ai_render_smoke=true`)
- [x] Added `ai_render_smoke_auth_modes` (`header`, `token`, `both`)
- [x] Added `ai_render_smoke_locales` (`es-MX`, `en-US`, `both`)

## Notes for Reviewers

- Risks:
  - `quality.yml` matrix filtering was moved to step-level guards (`run_combo`) to satisfy GitHub expression constraints; verify skipped combinations behave as expected in manual dispatch.
  - `src/core/http/module-route-dispatcher.ts` centralizes route ordering; any future route insertions should preserve dispatch order semantics.
- Rollback plan:
  - Revert `src/modules/ai/application/proposal-render-service.ts` + AI render handler wiring (`proposal-http-handlers.ts`, `app.ts`) to remove render endpoints.
  - Revert CI/script/doc additions related to `ai-render-smoke` if needed.
  - Revert test file splits if repository policy prefers single-file integrations.
- Follow-up tasks:
  - Add lightweight contract test for `module-route-dispatcher` ordering.
  - Consider shared integration test harness helpers to remove repeated `startServer` boilerplate.
  - Optional: add PR checklist automation for smoke summary presence in local pre-push checks.
