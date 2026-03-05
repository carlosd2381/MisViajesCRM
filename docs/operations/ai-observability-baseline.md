# AI Observability Baseline (P1-AI-02)

Guía mínima para monitorear costo/latencia del flujo AI en fase de integración.

## Objetivo

Tener visibilidad operativa de:

- volumen de requests AI,
- latencia promedio por operación,
- errores y bloqueos por quality gate,
- tokens/costo estimado acumulado.

## Endpoint operativo

- `GET /ai/metrics`
- Autorización: misma política de lectura AI (`read:itineraries`).
- Respuesta incluye:
  - `provider`
  - `totals.requests`
  - `totals.errors`
  - `totals.blockedByQualityGate`
  - `totals.avgDurationMs`
  - `totals.totalEstimatedTokens`
  - `totals.totalEstimatedCostUsd`
  - `byOperation.{proposal|render_web|render_pdf|schema|render_schema}`

## Variable de proveedor

- `AI_PROVIDER=mock|azure-openai|openai|local`
- Default actual: `mock`.

## Señales clave

- `errors` alto con `provider=azure-openai|openai`: posible incidente de integración externa.
- `blockedByQualityGate` alto: revisar calidad de `itinerarySummary` en clientes upstream.
- `avgDurationMs` creciente: revisar red/proveedor y tamaño de payload.
- `totalEstimatedCostUsd` fuera de presupuesto: ajustar prompts/modelo/caché.

## Checklist operativo diario

1. Consultar `GET /ai/metrics` en entorno de integración.
2. Registrar `provider`, `totals.requests`, `avgDurationMs`, `totalEstimatedCostUsd`.
3. Comparar contra guardrails de ADR de proveedor.
4. Si hay desviación, anotar acción correctiva en check-in diario.

## Nota de alcance

La estimación de tokens/costo en esta fase es aproximada y orientada a operación temprana. Se refinará al integrar proveedor LLM real y telemetría nativa.
