# PR Summary — Leads CSV Export Hardening (2026-03-12)

## What changed

### Leads CSV export (CRM UI)
- Added export of **currently visible** Leads rows (respects active search/filter/queue/sort context).
- Added inline **column selection** for export (minimal UX, no modal), with local persistence in view preferences.
- Added CSV metadata block at top of file including:
  - localized export timestamp
  - ISO export timestamp
  - scope (`visible/total`)
  - active queue
  - active filters
  - search term
  - active sort (field + direction)
- Added filename enrichment for traceability:
  - locale
  - ISO date/time stamp
  - visible/total scope

### CSV hardening
- Added UTF-8 BOM for spreadsheet compatibility.
- Added spreadsheet formula-injection mitigation by neutralizing formula-like cell prefixes (`=`, `+`, `-`, `@`).
- Added text normalization for exported cells:
  - newline normalization
  - tab replacement
  - repeated-whitespace collapse
  - trim
- Added max cell length cap with ellipsis truncation to avoid oversized CSV rows.

### i18n
- Added/updated Leads export labels in both locales:
  - `es-MX`
  - `en-US`

### Documentation
- Added canonical section in docs hub describing Leads CSV safeguards.
- Added data-dictionary cross-reference under `leads`.
- Added daily check-in entry for this workstream.
- Updated build plan with latest status and timestamp.

## Files touched (high level)
- `web/src/modules/crm/components/LeadsView.tsx`
- `web/src/modules/crm/i18n/es-MX.ts`
- `web/src/modules/crm/i18n/en-US.ts`
- `docs/README.md`
- `docs/data/data-dictionary.md`
- `docs/planning/build-plan.md`
- `docs/planning/daily-checkin-2026-03-12-leads-export-hardening.md`

## Why this change
- Improve operational usability of Leads exports for agents and ops.
- Preserve export context for downstream reporting/hand-off.
- Reduce CSV compatibility issues (Excel/Sheets).
- Reduce security and data-quality risks in spreadsheet workflows.

## Validation
- `npm run typecheck` ✅
- `npm run build:web` ✅

## Risks / compatibility
- No backend contract changes.
- No route changes.
- No schema changes.
- UI remains list-first and minimal.

## Suggested reviewer focus
- Export behavior with multiple filter/sort combinations.
- CSV opening behavior in Excel + Google Sheets (es-MX and en-US).
- Sanitation behavior for formula-like and multi-line values.

## Follow-up (optional, not included)
- UAT check with ops users for preferred default export columns.
- Add role-based column presets only if explicitly requested.
