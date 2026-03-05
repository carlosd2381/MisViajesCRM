# Daily Check-in Template (2-Week Execution)

Fecha: YYYY-MM-DD  
Owner: <nombre>  
Día de plan: Día X (1-10)

## 1) Objetivo del día

- Prioridad principal (P0/P1):
- Resultado esperado hoy:

## 2) Ejecución

- Tareas completadas:
  - [ ]
  - [ ]
- Tareas no completadas:
  - [ ]

## 3) Evidencia

- PR / commit / branch:
- Logs / artifacts:
- CI run URL:
- Documento actualizado:

## 4) Estado de riesgos y bloqueadores

- Bloqueadores activos:
  - [ ] Ninguno
  - [ ] Sí (describir)
- Riesgo nuevo detectado:
- Mitigación propuesta:
- Escalación requerida (sí/no):

## 5) Calidad y validaciones

- [ ] `npm run quality`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] Validación específica del día (anotar)

## 6) Decisiones / ADR

- ¿Se tomó una decisión de arquitectura/compliance hoy? (sí/no)
- Resumen de decisión:
- Documento/ADR enlazado:

## 7) Plan para mañana

- Top 3 acciones:
  1.
  2.
  3.
- Dependencias externas:
- Criterio de éxito para el siguiente día:

---

## Quick checklist por prioridad

### P0-DB-01 (Postgres CI)
- [ ] Corrida `postgres-integration` sin `skip`
- [ ] Evidence en `GITHUB_STEP_SUMMARY`
- [ ] Artifact/log adjunto

### P0-CFDI-01 (SAT/CFDI)
- [ ] Entidades técnicas definidas
- [ ] Migración draft creada
- [ ] Riesgos de cumplimiento documentados

### P1-AI-01 / P1-AI-02
- [ ] Proveedor LLM decidido
- [ ] Métricas de latencia/costo visibles
- [ ] Fallback documentado

### P1-ARCH-01 / P1-DATA-01
- [ ] Decisión commissions/financials documentada
- [ ] Contrato messaging↔itinerary definido
- [ ] Reglas FX timestamp + split comisiones definidas
