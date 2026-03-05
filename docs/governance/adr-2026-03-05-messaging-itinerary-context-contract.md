# ADR 2026-03-05 — Contrato de contexto `messaging` ↔ `itinerary`

Estado: Aprobada (provisional)
Fecha: 2026-03-05
Owner: Backend/Arquitectura

## Contexto

El roadmap requiere notificaciones enriquecidas en `messaging` con contexto de itinerario (estado, fechas, destino), sin crear acoplamiento circular entre módulos.

## Decisión

`messaging` no accede directamente a persistencia interna de `itinerary`.

En su lugar, consume un **contrato de contexto mínimo** transportado por payload/evento de aplicación.

## Contrato de contexto (v1)

Campos permitidos para enriquecer mensajes:

- `itineraryId` (obligatorio)
- `itineraryStatus` (obligatorio; enum lógico del módulo itinerary)
- `destination` (opcional)
- `startDate` (opcional)
- `endDate` (opcional)
- `currency` (opcional)
- `grossTotal` (opcional)
- `clientDisplayName` (opcional)
- `lastUpdatedAt` (obligatorio)

Restricciones:

- `messaging` trata estos campos como snapshot de lectura, no como fuente de verdad.
- No se exponen estructuras internas completas de `itinerary_items`.
- Cualquier campo nuevo del contrato requiere versión (`v2`) y compatibilidad hacia atrás.

## Eventos de integración sugeridos

- `itinerary.created`
- `itinerary.updated`
- `itinerary.approved`
- `itinerary.cancelled`

Semántica:

- El emisor (itinerary) publica evento con contexto `v1`.
- El consumidor (messaging) actualiza metadata de thread/notificación sin mutar estado de itinerary.

## Límites de responsabilidad

- `itinerary` mantiene reglas de negocio de estado, pricing y aprobación.
- `messaging` mantiene canales, dirección de mensajes, estado de entrega/lectura y rendering contextual.
- No se permiten escrituras cross-module directas entre repositorios de `messaging` y `itinerary`.

## Impacto esperado

- Reduce acoplamiento y riesgo de dependencias circulares.
- Permite notificaciones ricas con costo de integración bajo.
- Facilita evolución independiente de ambos módulos.

## Checklist de implementación

- Definir DTO `itineraryContext.v1` compartido en capa de aplicación.
- Agregar validación del payload de contexto en `messaging`.
- Agregar pruebas de integración para render/dispatch de notificaciones con contexto válido e inválido.
- Documentar versión del contrato en docs de arquitectura si se extiende.
