# PR Reviewer Comment Template — 2026-03-15 — Itinerary Portal Frontend

Equipo, este PR incluye FE-004/FE-005/FE-006 y refinamientos posteriores de portal público (A11y + mobile UX).

## Qué revisar primero

1. Flujo proposal/portal en `ItinerariesView`:
   - publish proposal
   - load portal preview
   - approve / request revision
2. Hardening UX:
   - loading states y botones deshabilitados durante operaciones
   - manejo de errores async sin UI colgada
   - fallback de clipboard copy
3. Portal público (`/view/p/:hash`):
   - estado vacío contextual (invalid hash vs no disponible)
   - CTA contextual (reintento / solicitar nuevo enlace)
   - bloqueo de acciones para propuestas `revoked/expired`
   - navegación sticky con `aria-current` y skip link
4. i18n:
   - textos en `es-MX` y `en-US` para proposal/portal/timeline/estados no disponibles

## Validación recomendada (rápida)

- Ejecutar checklist manual:
  - `docs/planning/qa-checklist-2026-03-15-itinerary-portal-frontend.md`
- Checks técnicos:
  - `npm run -s typecheck`
  - `cd web && npm run -s build`

- Smoke A11y mobile:
   - navegar portal público con teclado (tab/enter)
   - validar foco visible en skip link, nav sticky y CTAs de estado vacío
   - validar sticky nav con scroll horizontal en viewport pequeño

## Riesgos conocidos (scope-aware)

- Cambio menor de contrato frontend interno: loader público retorna `{ proposal, status, message }` para mejorar UX contextual.
- No hay cambios de contrato backend en este lote (solo consumo de endpoints existentes).
- Se observan deudas de lint históricas en módulos fuera de itinerary; no son parte de esta revisión.

## Criterio para aprobar

- Flujo publish → preview → action funciona sin errores de estado UI.
- Portal público maneja correctamente hash inválido / no disponible.
- Accesibilidad base confirmada (aria-live, foco y navegación por teclado).
- Timeline refleja acciones correctamente.
- Traducciones proposal/portal correctas en ambos locales.
- Typecheck/build en verde.

## Comentario sugerido de aprobación

`QA manual + checks técnicos validados. Flujo CRM/portal público estable, mejoras A11y/mobile correctas y sin regresiones visibles en scope de itineraries. LGTM.`
