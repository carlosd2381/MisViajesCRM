# Project Constraints (Obligatorio)

## 1) Idioma y localización

- **Idioma primario del producto: Español (México, `es-MX`)**.
- Toda UI, validaciones, mensajes de error, plantillas y textos de negocio se diseñan primero en `es-MX`.
- El producto debe tener opción de visualización en **Inglés (EE. UU., `en-US`)**.
- Cualquier texto nuevo debe entrar mediante llaves de i18n (no hardcodeado en componentes).

### Política de i18n

- `es-MX` es el locale por defecto para usuarios nuevos.
- Estructura de traducciones por feature:
  - `src/modules/<feature>/i18n/es-MX.json`
  - `src/modules/<feature>/i18n/en-US.json`
- Convención de llaves: `<feature>.<pantalla>.<elemento>.<tipo>`
  - Ejemplo: `leads.list.emptyState.title`

---

## 2) Documentación viva obligatoria

- Deben existir y mantenerse actualizados:
  - `docs/data/data-dictionary.md`
  - `docs/planning/build-plan.md`
- Regla de cambio:
  - Si cambia esquema, entidades o campos: actualizar `data-dictionary.md`.
  - Si cambia alcance, secuencia o fases: actualizar `build-plan.md`.

---

## 3) Límite de tamaño por archivo

- Objetivo (soft): **300 líneas** por archivo.
- Tope duro (hard): **450 líneas** por archivo.
- Excepción permitida solo con razón arquitectónica documentada en una sección "Excepciones" en el PR o ADR.
- Si se rebasa el límite, dividir por responsabilidad (feature, submódulo, utilidades, casos de uso).

---

## 4) Granularidad de funciones

- Las funciones deben idealmente mantenerse entre **20 y 30 líneas**.
- Umbral soft de control automático: **30 líneas efectivas**.
- Tope duro (hard): **60 líneas efectivas**.
- Cada función debe ejecutar **una sola operación lógica**.
- Si una función crece por encima del rango ideal, extraer pasos en funciones privadas/auxiliares.

### Política de excepciones

Se permiten excepciones cuando dividir empeora claridad o cohesión (ejemplos: validadores complejos, orquestación transaccional, tablas/mapeos estáticos extensos).

Toda excepción debe incluir en PR/ADR:

1. Motivo técnico breve.
2. Riesgo de mantenibilidad y mitigación.
3. Fecha objetivo o condición para refactor.

---

## 5) Estructura por feature (no por tipo)

- Organizar por dominio funcional, no por capas globales.
- Correcto:
  - `src/modules/leads/`
  - `src/modules/clients/`
  - `src/modules/itinerary/`
  - `src/modules/commissions/`
- Evitar carpetas globales tipo `all-controllers`, `all-services`, `all-models`.

### Estructura base sugerida por feature

```
src/modules/<feature>/
  api/
  application/
  domain/
  infrastructure/
  ui/
  i18n/
```

---

## 6) Definition of Done (DoD) mínima

Para considerar terminada una historia técnica/funcional:

1. Funciona en `es-MX`.
2. Incluye traducción `en-US`.
3. Respeta límite de 300 líneas por archivo.
4. Respeta funciones con granularidad adecuada.
5. Mantiene estructura por feature.
6. Actualiza build plan y/o data dictionary si aplica.

---

## 7) Enforcement automático (CI + local)

- Comando único de validación: `npm run quality`.
- Validaciones actuales:
  - `quality:file-size`: alerta sobre >300 líneas y falla sobre >450 líneas.
  - `quality:function-size`: alerta sobre >30 líneas efectivas y falla sobre >60 líneas efectivas.
  - `quality:docs`: asegura presencia de documentos obligatorios.
  - `quality:codeowners`: valida que `.github/CODEOWNERS` exista y no tenga placeholders.
- Pipeline CI: `.github/workflows/quality.yml` ejecuta las validaciones en push/PR.
