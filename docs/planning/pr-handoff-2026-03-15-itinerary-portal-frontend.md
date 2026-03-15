# PR Handoff — 2026-03-15 — Itinerary Portal Frontend

## Contexto rápido

Este PR cierra FE-004/FE-005/FE-006 de Itinerary Proposal Portal e incluye refinamientos posteriores del portal público (A11y + mobile UX).

- FE-004: publish/share + portal preview + approve/request-revision
- FE-005: hardening UX (loading states, timeline, guardas de acción)
- FE-006: hardening async errors (try/catch/finally, fallback clipboard, liberación de estados)
- Post FE-006: estado no disponible contextual, skip link, `aria-current` en nav, foco visible y mejoras mobile

## Scope exacto

- Incluye solo `web/` + docs de planning para handoff/review
- No modifica contratos backend ni migraciones

## Archivos críticos a revisar

- `web/src/App.tsx`
- `web/src/App.css`
- `web/src/modules/crm/components/ItinerariesView.tsx`
- `web/src/modules/crm/components/ProposalPortalPublicView.tsx`
- `web/src/modules/crm/types.ts`
- `web/src/modules/crm/i18n/es-MX.ts`
- `web/src/modules/crm/i18n/en-US.ts`

## Validación ya ejecutada

- `cd web && npm run -s build` ✅

## Guía de revisión

1. Seguir checklist QA manual:
   - `docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md`
2. Usar plantilla de comentario reviewer:
   - `docs/planning/pr-reviewer-comment-2026-03-15-itinerary-portal-frontend.md`
3. Usar body copy/paste para PR en GitHub:
   - `docs/planning/pr-github-body-2026-03-15-itinerary-portal-frontend.md`

## Riesgos conocidos

- Sin riesgos de DB/contract en este lote
- Existen deudas históricas fuera de scope en otros módulos; no mezclar en este PR

## Criterio de merge

- Flujo publish → preview → approve/revision validado
- Portal público validado en estados no disponibles + teclado + mobile
- Timeline e i18n correctos
- Build web en verde
