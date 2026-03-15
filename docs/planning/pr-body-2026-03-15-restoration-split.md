## Summary

- Restored previously stashed work and split it into clean, reviewable commits by domain.
- Recovered CRM client-facing updates (Clients, Itinerary Builder A11y/UX, Leads/Suppliers wiring).
- Recovered backend foundation for itinerary proposal portal (contracts, domain model, handlers, repository/service wiring, migration).
- Restored planning and data documentation updates captured during the same workstream.
- Pushed all restoration commits to `feat/itinerary-portal-a11y-mobile-v2`.

## Commit Breakdown

- `c17d1f8` — feat(crm): restore clients page updates
- `3a494a9` — feat(crm): restore itinerary builder a11y and ux improvements
- `1b6199a` — feat(itinerary): restore proposal portal backend foundation
- `293374e` — docs(planning): restore itinerary proposal planning notes
- `9c5d063` — feat(crm): restore leads and suppliers data wiring
- `f3a9579` — docs(data): update CRM data dictionary

## Scope

- [x] Frontend/Web (`web/`)
- [x] Backend/API (`src/`)
- [x] Database/Migrations (`db/`)
- [x] i18n
- [x] Docs/Planning/Data

## Validation

- [x] `npm run typecheck`
- [x] `npm run build:web`

## Reviewer Guide

- Review commit-by-commit in listed order; each commit is intentionally scoped.
- Start with CRM-only commits (`c17d1f8`, `3a494a9`, `9c5d063`) for UI/data wiring changes.
- Continue with backend foundation (`1b6199a`) to validate end-to-end model/contract consistency.
- Finish with docs commits (`293374e`, `f3a9579`).

## Risks / Rollback

- Primary risk is integration drift between restored frontend behavior and backend contracts if any parallel branch introduced conflicting changes.
- Rollback is straightforward by reverting specific commits independently due to scoped split.

---

### Suggested PR title

`feat: restore stashed CRM + itinerary proposal work in scoped commits`
