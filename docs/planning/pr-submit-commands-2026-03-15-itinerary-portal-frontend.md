# PR Submit Commands — 2026-03-15 — Itinerary Portal Frontend

## 0) Quick one-liner staging (same scope)

```bash
git add web/src/App.tsx web/src/App.css web/src/modules/crm/components/ItinerariesView.tsx web/src/modules/crm/components/ProposalPortalPublicView.tsx web/src/modules/crm/types.ts web/src/modules/crm/i18n/es-MX.ts web/src/modules/crm/i18n/en-US.ts docs/planning/night-handoff-2026-03-15.md docs/planning/pr-summary-2026-03-15-itinerary-portal-frontend.md docs/planning/pr-handoff-2026-03-15-itinerary-portal-frontend.md docs/planning/pr-body-2026-03-15-itinerary-portal-frontend.md docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md docs/planning/pr-reviewer-comment-2026-03-15-itinerary-portal-frontend.md docs/planning/pr-submit-commands-2026-03-15-itinerary-portal-frontend.md docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```

## 1) Stage only itinerary frontend + planning docs

```bash
git add \
  web/src/App.tsx \
  web/src/App.css \
  web/src/modules/crm/components/ItinerariesView.tsx \
  web/src/modules/crm/components/ProposalPortalPublicView.tsx \
  web/src/modules/crm/types.ts \
  web/src/modules/crm/i18n/es-MX.ts \
  web/src/modules/crm/i18n/en-US.ts \
  docs/planning/night-handoff-2026-03-15.md \
  docs/planning/pr-summary-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-handoff-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-body-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-reviewer-comment-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-submit-commands-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```

## 2) Commit

```bash
git commit -m "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening"
```

## 3) Final checks

```bash
npm run -s typecheck
cd web && npm run -s build
```

## 4) Push

```bash
git push origin <your-branch>
```

## 5) Open PR with GitHub CLI (optional)

```bash
gh pr create \
  --title "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" \
  --body-file docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```

If needed, add base branch explicitly:

```bash
gh pr create --base main --title "..." --body-file docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```

## 6) One-liner (commit + push + open PR)

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD) && git commit -m "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" && git push origin "$BRANCH" && gh pr create --base main --title "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" --body-file docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```

Si prefieres conservar push/PR manual, usa pasos 2-5.

## 7) Safe one-liner (checks + commit + push + open PR)

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD) && npm run -s typecheck && (cd web && npm run -s build) && git commit -m "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" && git push origin "$BRANCH" && gh pr create --base main --title "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" --body-file docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```

Nota: este comando asume que ya corriste el `git add` del scope correcto (paso 0 o 1).

## 8) Preflight de staged files (scope guard)

Ver staged actual:

```bash
git diff --cached --name-only
```

Validar que todo staged pertenece al scope esperado (`web/src/...` y `docs/planning/...`):

```bash
git diff --cached --name-only | grep -Ev '^(web/src/|docs/planning/)'
```

Esperado: **sin salida**. Si aparece algo, quítalo del stage antes de commit.

Quitar archivo accidental del stage:

```bash
git restore --staged <path>
```

## 9) Secuencia final recomendada (safe scope)

Limpiar stage completo para empezar en limpio:

```bash
git restore --staged .
```

Stage exclusivo del scope de este PR:

```bash
git add \
  web/src/App.tsx \
  web/src/App.css \
  web/src/modules/crm/components/ItinerariesView.tsx \
  web/src/modules/crm/components/ProposalPortalPublicView.tsx \
  web/src/modules/crm/types.ts \
  web/src/modules/crm/i18n/es-MX.ts \
  web/src/modules/crm/i18n/en-US.ts \
  docs/planning/night-handoff-2026-03-15.md \
  docs/planning/pr-summary-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-handoff-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-body-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-reviewer-comment-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md \
  docs/planning/pr-submit-commands-2026-03-15-itinerary-portal-frontend.md
```

Verificar stage antes de commit:

```bash
git diff --cached --name-only
```

Commit + push + PR:

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD) && \
git commit -m "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" && \
git push origin "$BRANCH" && \
gh pr create --base main --title "feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening" --body-file docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md
```
