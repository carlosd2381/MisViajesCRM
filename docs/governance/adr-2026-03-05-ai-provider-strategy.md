# ADR 2026-03-05 — Estrategia de proveedor LLM (P1-AI-01)

Estado: Aprobada (fase inicial)
Fecha: 2026-03-05
Owner: AI/Backend

## Contexto

El módulo AI opera actualmente en modo mock. Para cerrar Fase 2 se requiere una estrategia explícita de proveedor real con control de costo/latencia y fallback.

## Decisión

Se adopta una estrategia por capas:

1. **Proveedor primario**: `azure-openai` (entorno enterprise, controles de seguridad y gobierno).
2. **Proveedor secundario/fallback**: `openai` (continuidad operativa ante indisponibilidad del primario).
3. **Modo contingencia**: `mock` (degradación controlada para continuidad funcional no productiva).

Selección runtime (fase inicial):

- Variable `AI_PROVIDER` con valores permitidos: `mock`, `azure-openai`, `openai`, `local`.
- Default actual: `mock`.

## Reglas operativas

- Producción no debe operar en `mock` salvo incidente mayor documentado.
- Staging debe probar al menos un proveedor real (`azure-openai` u `openai`) antes de release.
- Cualquier cambio de proveedor requiere actualización de esta ADR y evidencia de validación.

## Presupuesto y guardrails iniciales

- Objetivo de latencia p95 por request AI: <= 3500 ms.
- Objetivo de costo estimado por request (fase inicial): <= 0.02 USD.
- Si se supera umbral de costo o latencia sostenida, activar fallback definido.

## Fallback y continuidad

- Falla proveedor primario: conmutar a `openai`.
- Falla general de proveedores externos: usar `mock` temporalmente para no bloquear flujo de propuesta.
- Toda activación de fallback debe quedar registrada en check-in y runbook.

## Evidencia de cierre P1-AI-01

- ADR aprobada.
- Variables de entorno objetivo definidas.
- Prueba en entorno de integración con proveedor real planificada para siguiente iteración.
