## Summary

- Describe the change in 2-5 bullets.

## Scope

- [ ] Backend/API
- [ ] Auth/JWT/Sessions
- [ ] Observability/CI
- [ ] Docs only

## Validation

- [ ] `npm run test`
- [ ] `npm run typecheck`
- [ ] `npm run quality`
- [ ] `npm run quality:codeowners` (cuando aplique a auth/CI/ownership)

## Docs and Governance

- [ ] Updated `docs/planning/build-plan.md` if scope/sequence changed
- [ ] Updated `docs/data/data-dictionary.md` if data model changed
- [ ] Updated operational docs when auth/CI/observability behavior changed

## Auth/CI Checklist

- [ ] If auth or CI behavior changed, considered manual `workflow_dispatch` with `force_auth_smoke=true`
- [ ] Selected `auth_smoke_modes` (`header`, `token`, `both`) appropriate for risk
- [ ] Selected `auth_smoke_locales` (`es-MX`, `en-US`, `both`) appropriate for i18n risk
- [ ] If AI schema or CI behavior changed, considered manual `workflow_dispatch` with `force_ai_schema_smoke=true`
- [ ] Selected `ai_schema_smoke_auth_modes` (`header`, `token`, `both`) appropriate for risk
- [ ] Selected `ai_schema_smoke_locales` (`es-MX`, `en-US`, `both`) appropriate for i18n risk
- [ ] If AI render or CI behavior changed, considered manual `workflow_dispatch` with `force_ai_render_smoke=true`
- [ ] Selected `ai_render_smoke_auth_modes` (`header`, `token`, `both`) appropriate for risk
- [ ] Selected `ai_render_smoke_locales` (`es-MX`, `en-US`, `both`) appropriate for i18n risk

## Notes for Reviewers

- Risks:
- Rollback plan:
- Follow-up tasks:
