# ADR 2026-03-05 — Límite de dominio: Commissions vs Financials

Estado: Aprobada (provisional, sujeta a revisión al cerrar Sprint 2)
Fecha: 2026-03-05
Owner: Backend/Arquitectura

## Contexto

El proyecto ya tiene módulos separados de `commissions` y `financials`, pero se detectó riesgo de acoplamiento/confusión porque ambos tratan conceptos monetarios.

Necesitamos una frontera de dominio explícita para evitar duplicidad de responsabilidades, regresiones en cálculo y drift en API/datos.

## Decisión

Se mantiene separación de dominios:

- `commissions` modela expectativa/cobro de comisión por proveedor y su ciclo comercial.
- `financials` modela ledger de movimientos contables/operativos multicurrency.

Relación entre dominios:

- `commissions` puede referenciar contexto de `itinerary` y `supplier`.
- `financials` puede registrar transacciones que impactan caja/ledger.
- El vínculo entre ambos es por referencia de negocio (IDs) y eventos/estado, no por mezclar reglas en un solo agregado.

## Reglas de frontera

1. Cálculo de estatus de comisión (`unclaimed/claimed/paid/disputed`) vive en `commissions`.
2. Cálculo/registro de montos contables, tipo de cambio y conciliación vive en `financials`.
3. Un pago de comisión en ledger no debe mutar automáticamente reglas de negocio de `commissions` sin una transición explícita de aplicación.
4. `financials` no define policy de “cuándo corresponde comisión”; solo registra impacto monetario.
5. `commissions` no sustituye al ledger; solo orquesta expectativa/recepción de comisión.

## Consecuencias

Positivas:

- Menor acoplamiento y ownership más claro.
- Mejor trazabilidad para auditoría (comercial vs contable).
- Evolución independiente de reglas de comisión y ledger multicurrency.

Trade-offs:

- Se requiere coordinación por contrato/eventos entre módulos.
- Hay riesgo de desalineación de estado si no se formalizan transiciones.

## Plan de implementación mínimo

- Mantener contratos API separados para `commissions` y `financials`.
- Definir mapeo explícito de eventos de negocio (ej. comisión pagada) a transacciones ledger.
- Agregar validaciones de consistencia en integración para evitar drift entre ambos estados.
- Documentar en data dictionary campos de referencia cruzada cuando aplique.

## Criterio de revisión

Revisar esta ADR al cierre de Sprint 2 o antes si:

- aparece duplicidad real de reglas en ambos módulos,
- se detecta alto costo de sincronización entre estados,
- o cambian requerimientos regulatorios que obliguen un modelo unificado.
