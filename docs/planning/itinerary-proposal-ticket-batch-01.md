# Ticket Batch 01 — Itinerary Proposal Portal

Estado: Ready for execution
Fecha: 2026-03-14

## Backend tickets

### ITIN-BE-001 — Pipeline statuses + status events

Scope:
- Agregar estado revised al dominio de itinerario.
- Crear endpoint de transición de pipeline.
- Registrar eventos de transición con actor + timestamp.

Definition of done:
- GET kanban devuelve columnas correctas.
- POST move valida transiciones y persiste event log.
- Pruebas de integración para transición válida e inválida.

### ITIN-BE-002 — Day/Activity builder schema + CRUD

Scope:
- Nuevas tablas para itinerary_days e itinerary_day_activities.
- Endpoints CRUD mínimos de days/activities.
- Reordenamiento por índices y recalculo de totales.

Definition of done:
- Se pueden crear/editar/reordenar días y actividades.
- Totales se recalculan al mutar actividades/opcionales.
- Integración cubre create/update/reorder.

### ITIN-BE-003 — Destination Library foundation

Scope:
- Tabla destination_library con descripciones ES/EN, media, coords.
- Endpoint read/search para lookup por destino/categoría.
- Política de prioridad de contenido curado.

Definition of done:
- API devuelve contentSource=internal|fallback.
- Índices por location_name/category operativos.

### ITIN-BE-004 — Publication hash + portal actions

Scope:
- Publicar propuesta a hash seguro.
- Endpoints portal público (read-only + actions).
- Registrar approve/request_revision y enlazar con messaging.

Definition of done:
- Hash único no indexado, con revoke/expire.
- Acción cliente crea evento y dispara notificación a agente asignado.

### ITIN-BE-005 — AI structured workflows contracts

Scope:
- Contratos y validación JSON para generate/tone-transform/validate-logic.
- Respuesta versionada y schema-safe.

Definition of done:
- Payload inválido retorna 400 con errores claros.
- Integración valida output shape por workflow.

## Frontend tickets

### ITIN-FE-001 — Kanban proposal pipeline

Scope:
- Vista Kanban en módulo itineraries.
- Drag-and-drop con persistencia por API.
- Indicadores de estado y conteos por columna.

Definition of done:
- DnD exitoso mueve tarjeta y persiste.
- Error API revierte estado visual.

### ITIN-FE-002 — Day-by-day interactive builder

Scope:
- Editor de días y actividades en árbol.
- Controles de opcionales y panel totalizer en vivo.

Definition of done:
- Cambios se guardan sin refresh.
- Totalizer refleja add/remove opcionales inmediatamente.

### ITIN-FE-003 — Media + map panel

Scope:
- Integrar lookup de media por activity.
- Integrar mapa con marcadores por lat/lng.

Definition of done:
- Si no hay media interna, UI muestra fallback explícito.
- Mapa renderiza items del día seleccionado.

### ITIN-FE-004 — Client portal PWA

Scope:
- Ruta /view/p/:hash responsive.
- Sticky nav por día.
- Botones Approve / Request Revision.

Definition of done:
- Navegación fluida en móvil.
- Acciones cliente reflejan resultado en UI y backend.

## DevOps/QA tickets

### ITIN-QA-001 — Integration matrix

Scope:
- Cobertura integración para pipeline, builder, publication, portal actions.

Definition of done:
- Suite verde en memory + postgres para rutas críticas.

### ITIN-OPS-001 — Feature flags + observability

Scope:
- Flags para maps/flights/portal-public.
- Métricas de transición de estado y acciones de portal.

Definition of done:
- Métricas visibles para accepted rate y revision loop.

## Orden recomendado de ejecución

1) ITIN-BE-001
2) ITIN-BE-002
3) ITIN-FE-001
4) ITIN-BE-004
5) ITIN-FE-004
6) ITIN-BE-003 + ITIN-FE-003
7) ITIN-BE-005
8) QA/OPS
