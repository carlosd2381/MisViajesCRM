## Summary

- Completed itinerary proposal/portal frontend flow in CRM web for FE-004, FE-005, and FE-006.
- Added proposal publication and portal actions wiring in web app:
  - publish proposal
  - load portal preview by hash
  - trigger approve/request-revision actions
- Added proposal portal UX hardening:
  - explicit loading states
  - action guards and disabled states during async operations
  - portal action timeline rendering
  - robust clipboard copy handling with fallback messages
- Updated itinerary i18n strings in both locales (`es-MX`, `en-US`) for proposal/portal UX.
- Added post FE-006 refinements for public proposal portal (`/view/p/:hash`):
  - reason-aware unavailable states (invalid hash vs not available)
  - contextual CTA (retry vs request new link)
  - action safety for revoked/expired publications
  - accessibility improvements (`aria-live`, focus management, skip link, semantic timeline, `aria-current` nav)
  - mobile UX refinements (timeline readability, compact density, horizontal sticky nav scroll)

## Scope

- [x] Frontend/Web (`web/`)
- [ ] Backend/API
- [ ] Database/Migrations
- [x] i18n
- [x] Docs/Planning

## Validation

- [x] `cd web && npm run -s build` (executed repeatedly during iterative refinements)

## Manual QA

- [ ] Ejecutar checklist: `docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md`
- [ ] Adjuntar evidencia visual (publish, timeline, locale en-US)

## Reviewer Guide

- Plantilla de comentario para reviewer: `docs/planning/pr-reviewer-comment-2026-03-15-itinerary-portal-frontend.md`
- Handoff para reviewer/merge owner: `docs/planning/pr-handoff-2026-03-15-itinerary-portal-frontend.md`

## Changed Areas

- `web/src/App.tsx`
- `web/src/modules/crm/components/ItinerariesView.tsx`
- `web/src/modules/crm/components/ProposalPortalPublicView.tsx`
- `web/src/modules/crm/types.ts`
- `web/src/modules/crm/i18n/es-MX.ts`
- `web/src/modules/crm/i18n/en-US.ts`
- `web/src/App.css`
- `docs/planning/night-handoff-2026-03-15.md`
- `docs/planning/pr-summary-2026-03-15-itinerary-portal-frontend.md`
- `docs/planning/pr-reviewer-comment-2026-03-15-itinerary-portal-frontend.md`
- `docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md`

## Notes for Reviewers

- This PR focuses on frontend consumption of already existing itinerary/portal endpoints.
- No backend contract changes introduced in this batch.
- Includes a small frontend-internal contract update: public loader now returns `{ proposal, status, message }` to support contextual unavailable UX.
- Existing unrelated lint debt in other modules is intentionally out of scope.

## Risks / Rollback

- Risk: low to medium (UI flow changes in itinerary module only).
- Rollback: revert the files listed in **Changed Areas**; no migration rollback needed.

---

### Suggested PR title

`feat(web): complete itinerary proposal portal UX with public portal a11y/mobile hardening`
