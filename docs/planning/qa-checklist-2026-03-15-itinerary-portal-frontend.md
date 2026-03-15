# QA Checklist — 2026-03-15 — Itinerary Portal Frontend

Objetivo: validar end-to-end el flujo de propuesta/portal desde CRM web con backend activo.

## Precondiciones

- API corriendo (`npm run dev:api`).
- Web corriendo (`npm run dev:web`).
- Existe al menos un itinerario visible en módulo Itineraries.
- Usuario con permisos de agente en sesión web.

## Caso 1 — Publicar propuesta

1. Abrir módulo `Itineraries`.
2. Abrir builder de un itinerario en estado `draft` o `sent`.
3. En panel de propuesta, definir `expiresAt` (opcional).
4. Click en **Publicar propuesta**.

Esperado:
- Se muestra mensaje de éxito.
- Aparece link compartible.
- Se habilita acción de cargar preview de portal.
- No quedan botones pegados en estado loading.

## Caso 2 — Copy/Open link

1. Click en **Copiar link**.
2. Pegar en bloc de notas y validar formato URL.
3. Click en **Abrir portal**.

Esperado:
- Copiado exitoso con mensaje de confirmación.
- Si clipboard falla, mensaje controlado de fallback (sin crash).
- El portal abre y responde con contenido de propuesta.

## Caso 3 — Cargar preview de portal en CRM

1. En panel de propuesta, click en **Cargar preview de portal**.

Esperado:
- Se visualiza estado del portal.
- Se muestra contador de acciones.
- Se actualiza `lastViewedAt` cuando aplica.
- Timeline de acciones visible y ordenado por fecha descendente.

## Caso 4 — Acción Approve

1. (Opcional) escribir mensaje de aprobación.
2. Click en **Aprobar desde portal**.

Esperado:
- Mensaje de acción exitosa.
- Pipeline del itinerario refleja transición compatible (`accepted`).
- Timeline agrega evento `approve` con actor y timestamp.
- Botones se bloquean durante la operación y se reactivan al finalizar.

## Caso 5 — Acción Request Revision

1. Dejar feedback vacío y validar que botón quede deshabilitado.
2. Capturar feedback válido.
3. Click en **Solicitar revisión**.

Esperado:
- Con feedback vacío: acción bloqueada.
- Con feedback válido: mensaje de éxito.
- Pipeline refleja transición a `revised` cuando aplique.
- Timeline agrega evento `request_revision`.

## Caso 6 — Resiliencia ante error de red

1. Con devtools, simular offline o error de request.
2. Reintentar publish o acciones de portal.

Esperado:
- Mensaje de error controlado en UI.
- Sin pantallas congeladas ni loops.
- Estados de loading se liberan siempre (botones vuelven a estado usable).

## Caso 7 — i18n básico

1. Cambiar locale entre `es-MX` y `en-US`.
2. Revisar labels del panel proposal/portal.

Esperado:
- Textos de proposal/portal/timeline se traducen correctamente.
- No aparecen llaves de traducción crudas.

## Caso 8 — Estado no disponible en portal público

1. Abrir URL con hash inválido (formato incompleto).
2. Abrir URL con hash con formato válido pero inexistente.

Esperado:
- Hash inválido:
  - se muestra estado contextual de enlace inválido
  - aparece CTA **Solicitar nuevo enlace**
  - no se muestra botón superior de actualizar portal
- Hash inexistente/no disponible:
  - se muestra estado contextual de propuesta no disponible
  - aparece CTA **Reintentar carga**
  - se mantiene referencia del hash visible

## Caso 9 — Accesibilidad básica portal público

1. Navegar con teclado desde el inicio de la página pública.
2. Activar skip link para saltar a contenido principal.
3. Revisar mensajes de estado de carga/error en lector de pantalla (si aplica).

Esperado:
- Skip link visible al foco y funcional.
- Foco visible en navegación sticky y CTAs de estado vacío.
- Estados dinámicos anunciables (`aria-live`) sin ruido excesivo.

## Caso 10 — Mobile UX del portal público

1. Abrir portal público en viewport pequeño (ej. 390x844).
2. Revisar sticky nav cuando no quepan todos los botones.
3. Revisar historial/timeline con textos largos.

Esperado:
- Sticky nav permite scroll horizontal fluido.
- No hay solapamiento de botones en nav.
- Timeline mantiene legibilidad (metadata envuelta y espaciado consistente).
- Densidad vertical de cards/status se percibe compacta pero legible.

## Cierre técnico recomendado

- Ejecutar `npm run -s typecheck`.
- Ejecutar `cd web && npm run -s build`.
- Adjuntar evidencia en PR:
  - 1 captura de panel proposal publicado
  - 1 captura de timeline con acciones
  - 1 captura de locale alterno (`en-US`)
  - 1 captura mobile de sticky nav horizontal
  - 1 captura de estado no disponible (hash inválido o no disponible)
