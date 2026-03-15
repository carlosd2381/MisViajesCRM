# Itinerary / Proposal Portal — Technical Spec (v1)

Estado: Draft listo para implementación
Fecha: 2026-03-14
Owner sugerido: Backend + Web + Product

## 1) Objetivo del módulo

Convertir el módulo de itinerarios de un generador de documentos a un portal de venta interactivo, con pipeline visual, builder día-por-día, IA estructurada y portal cliente móvil.

## 2) Principios de diseño

- API-first y modular (dominio separado por subcapacidades).
- Mobile-first en experiencia cliente (PWA + navegación sticky por día).
- Datos auditables para analytics de ventas (timestamps por transición).
- Salidas AI estrictamente en JSON validado contra esquema.
- Fallback explícito para integraciones externas (maps, flights, media).

## 3) Alcance funcional v1

### 3.1 Pipeline de propuesta (Kanban)

Estados objetivo:
- draft
- sent
- revised
- accepted

Reglas:
- Cada transición registra evento con timestamp y actor.
- Cambios por drag-and-drop deben invocar endpoint de transición (no mutación local ciega).
- Métricas mínimas: tiempo en estado, total revisiones, tasa aceptación.

### 3.2 Builder interactivo

Estructura:
- Day (padre): índice, fecha, título.
- Activity (hijo): hora estimada, categoría, descripción, precio base, opcionales, coordenadas, refs de media.

Reglas:
- Orden estable por day_index y activity_index.
- Totalizer recalcula al agregar/quitar opcionales sin refresh.

### 3.3 Media y biblioteca curada

Fuente primaria: Destination Library interno.
Fallback: placeholder explícito.

Prioridad:
1) custom_description_es / media interna.
2) custom_description_en.
3) placeholder con flag de curación pendiente.

### 3.4 Mapa y logística

- Mapa con marcadores por lat/lng de actividades.
- Estado de vuelos en vista cliente con cache backend.
- UI debe mostrar timestamp de último refresh para datos de vuelo.

### 3.5 IA estructurada (botón “Magic”)

Workflow A — Generator:
- Input: guestProfile, durationDays, destination, interests.
- Output: JSON mapeable a days/activities + resumen.

Workflow B — Tone Transformer:
- Input: texto + targetTone (luxury_inspiring | practical_direct).
- Output: texto transformado.

Workflow C — Logic Validator:
- Input: propuesta estructurada.
- Output: warnings/errors (tiempos imposibles, incompatibilidad por edad, etc.).

### 3.6 Portal cliente (Live Web View)

- URL hash única por propuesta publicada.
- Acciones: approve / request_revision.
- Notificaciones a agente asignado por WhatsApp/email a través del módulo messaging.
- PWA + barra sticky para saltar entre días.

## 4) Arquitectura backend propuesta

Submódulos en itinerary:
- pipeline (estados + eventos)
- builder (days + activities)
- publication (portal hash + acciones cliente)
- integrations (maps/flights/media providers)
- ai-orchestration (workflows y validación schema)

### Endpoints v1 sugeridos

Kanban:
- GET /itineraries?view=kanban
- POST /itineraries/:id/pipeline/move

Builder:
- GET /itineraries/:id/days
- POST /itineraries/:id/days
- PATCH /itineraries/:id/days/:dayId
- POST /itineraries/:id/days/:dayId/activities
- PATCH /itineraries/:id/days/:dayId/activities/:activityId

Publicación/Portal:
- POST /itineraries/:id/publish
- GET /portal/proposals/:hash
- POST /portal/proposals/:hash/actions/approve
- POST /portal/proposals/:hash/actions/request-revision

IA estructurada:
- POST /ai/itinerary/generate
- POST /ai/itinerary/tone-transform
- POST /ai/itinerary/validate-logic

## 5) Frontend v1 (web)

CRM (agente):
- Nueva vista Itineraries funcional en sidebar.
- Kanban DnD con columnas Draft/Sent/Revised/Accepted.
- Builder día-por-día con editor de actividades.
- Panel totalizer en tiempo real.

Portal cliente:
- Ruta /view/p/:hash.
- Navegación sticky por día.
- Botones approve/request_revision.
- Vista mobile-first.

## 6) Riesgos y mitigaciones

- Integraciones externas inestables -> cache, timeout, fallback UI.
- Drift de payload AI -> schema JSON versionado + validación estricta.
- Cálculo inconsistente entre cliente y servidor -> servidor como fuente de verdad.
- Escalabilidad de media -> priorizar metadata y URLs; evitar blobs en DB.

## 7) Criterios de aceptación v1

- Flujo completo Draft -> Sent -> Revised -> Accepted operativo y auditado.
- Portal hash accesible sin auth interna, con expiración/revocación.
- Acciones cliente disparan evento + notificación al agente.
- Builder persiste day/activity en orden estable.
- Totalizer consistente entre UI y backend.
- Pruebas de integración cubren transiciones, publicación y acciones del portal.
