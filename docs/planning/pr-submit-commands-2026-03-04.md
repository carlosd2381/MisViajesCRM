# PR Submit Commands — 2026-03-04

## Recommended commit split

### Commit 1 — Feature + tests + routing

```bash
git add \
  src/modules/ai/application/proposal-render-service.ts \
  src/modules/ai/api/proposal-http-handlers.ts \
  src/modules/ai/api/proposal-contracts.ts \
  src/core/http/module-route-dispatcher.ts \
  src/app.ts \
  src/integration/ai-render.integration.test.ts \
  src/integration/itinerary-items.integration.test.ts \
  src/integration/itinerary.integration.test.ts

git commit -m "feat(ai): add proposal web/pdf render endpoints and route dispatcher"
```

### Commit 2 — CI/ops/docs

```bash
git add \
  tools/ops/ai-render-smoke-check.mjs \
  tools/ops/smoke-matrix-check.mjs \
  .github/workflows/quality.yml \
  .github/pull_request_template.md \
  docs/README.md \
  docs/operations/auth-incident-runbook.md \
  docs/planning/build-plan.md \
  docs/planning/pr-handoff-2026-03-04.md \
  docs/planning/pr-body-2026-03-04.md \
  package.json

git commit -m "chore(ci,docs): add ai render smoke matrix and operational runbooks"
```

## Final verification

```bash
npm run quality
npm run typecheck
npm run test
```

## Push

```bash
git push origin main
```

## Open PR with GitHub CLI (optional)

```bash
gh pr create \
  --title "feat(ai): add proposal web/pdf render endpoints with smoke + CI matrix hardening" \
  --body-file docs/planning/pr-body-2026-03-04.md
```

If your default base branch is not `main`, add `--base <branch>`.
