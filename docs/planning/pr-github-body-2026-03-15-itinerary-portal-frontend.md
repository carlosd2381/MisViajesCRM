## Summary

This PR completes the itinerary proposal portal frontend flow and adds post FE-006 hardening for the public portal experience.

### Included

- FE-004/FE-005/FE-006 completion in CRM itinerary proposal flow:
  - publish proposal
  - share/open proposal link
  - portal preview
  - approve / request revision actions
  - async UX hardening and error-safe loading states
- Public portal refinements (`/view/p/:hash`):
  - reason-aware unavailable states (`invalid_hash` vs not available)
  - contextual CTA (`Retry loading` vs `Request new link`)
  - guarded actions for `revoked`/`expired` publications
  - semantic timeline and improved keyboard/screen-reader support
  - mobile readability and sticky nav horizontal scrolling

## Scope

- Frontend only (`web/`) + planning docs
- No backend contract or migration changes

## Key Files

- `web/src/App.tsx`
- `web/src/App.css`
- `web/src/modules/crm/components/ItinerariesView.tsx`
- `web/src/modules/crm/components/ProposalPortalPublicView.tsx`
- `web/src/modules/crm/types.ts`
- `web/src/modules/crm/i18n/es-MX.ts`
- `web/src/modules/crm/i18n/en-US.ts`

## Validation

- [x] `cd web && npm run -s build`
- [ ] Run manual QA checklist: `docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md`

## Reviewer Checklist

- [ ] Publish → preview → approve/request-revision flow works in CRM
- [ ] Public portal unavailable states are contextual and actionable
- [ ] Keyboard focus/skip link/nav active state behaves correctly
- [ ] Mobile sticky nav/timeline remain usable and readable
- [ ] i18n labels are correct in `es-MX` and `en-US`

## Risks / Notes

- Low risk: UI-focused changes scoped to itinerary proposal/portal surfaces
- Existing unrelated lint debt outside itinerary scope remains out of this PR
