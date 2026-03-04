# Data Dictionary (Documento Vivo)

Estado: Borrador inicial
Última actualización: 2026-03-03

## Convenciones generales

- IDs primarios: `uuid`.
- Timestamps: `created_at`, `updated_at` (UTC).
- Soft delete cuando aplique: `deleted_at`.
- Campos sensibles (PII/documentos): cifrado at-rest (AES-256).
- Monedas: usar ISO 4217 (`MXN`, `USD`, `EUR`).

---

## Entidades núcleo

## 1) leads

Descripción: registro inicial de oportunidad comercial.

Campos clave:
- `id` (uuid, PK)
- `status` (enum: new, contacted, proposal_sent, follow_up, closed_won, closed_lost)
- `source` (enum: whatsapp, instagram, facebook, referral, website, walk_in)
- `priority` (enum: low, medium, high, vip)
- `destination` (text)
- `travel_start_date` (date, nullable)
- `travel_end_date` (date, nullable)
- `adults_count` (int)
- `children_count` (int)
- `budget_min` (numeric)
- `budget_max` (numeric)
- `budget_currency` (char(3))
- `trip_type` (text)
- `notes` (text)
- `assigned_agent_id` (uuid, FK users.id)

---

## 2) clients

Descripción: perfil profesional del cliente.

Campos clave:
- `id` (uuid, PK)
- `lead_id` (uuid, FK leads.id, nullable)
- `first_name` (text)
- `middle_name` (text, nullable)
- `last_name_paternal` (text)
- `last_name_maternal` (text, nullable)
- `gender` (text, nullable)
- `birth_date` (date, nullable)
- `anniversary_date` (date, nullable)
- `company_name` (text, nullable)
- `job_title` (text, nullable)
- `website` (text, nullable)
- `travel_preferences_json` (jsonb)

Subentidades sugeridas:
- `client_contacts`
- `client_addresses`
- `client_relationships`
- `client_loyalty_programs`
- `client_documents`
- `client_health_records`

---

## 3) suppliers

Descripción: proveedores y partners.

Campos clave:
- `id` (uuid, PK)
- `name` (text)
- `trade_name` (text, nullable)
- `type` (enum: wholesaler, hotel, airline, dmc, car_rental, insurance, tour_operator, private_transport, cruise_line)
- `rfc` (text, nullable)
- `status` (enum: active, inactive, blacklisted)
- `default_currency` (char(3))
- `commission_type` (enum: percentage, fixed)
- `commission_rate` (numeric)
- `payout_terms` (enum: prepaid, post_travel_30, post_travel_60, upon_booking)
- `internal_risk_flag` (enum: high_risk, caution, reliable)

Subentidades sugeridas:
- `supplier_contacts`
- `supplier_bank_info`
- `supplier_incidents`
- `supplier_documents`

---

## 4) itineraries

Descripción: propuesta/itinerario del viaje.

Campos clave:
- `id` (uuid, PK)
- `client_id` (uuid, FK clients.id)
- `agent_id` (uuid, FK users.id)
- `title` (text)
- `status` (enum: draft, sent, accepted, paid, completed, cancelled)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `currency` (char(3))
- `gross_total` (numeric)
- `net_total` (numeric)
- `markup_amount` (numeric)
- `service_fee_amount` (numeric)
- `agency_profit` (numeric)
- `ai_narrative_intro` (text, nullable)

Subentidades sugeridas:
- `itinerary_items`
- `itinerary_notes`
- `itinerary_files`

Campos base implementados en migración (`20260304_003_itineraries.sql`):

- `id` (uuid, PK)
- `client_id` (uuid, FK clients.id)
- `agent_id` (text)
- `title` (text)
- `status` (enum lógico: draft, sent, accepted, paid, completed, cancelled)
- `start_date` (date, nullable)
- `end_date` (date, nullable)
- `currency` (char(3), MXN|USD|EUR)
- `gross_total` (numeric)
- `net_total` (numeric)
- `markup_amount` (numeric)
- `service_fee_amount` (numeric)
- `agency_profit` (numeric)
- `ai_narrative_intro` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Notas operativas implementadas:

- Endpoint de aprobación: `POST /itineraries/:id/approve`.
- Al aprobar, `status` se actualiza a `accepted`.
- Cambios de itinerario (`create`, `update`, `approve`) generan evento en `audit_events` cuando `STORAGE_MODE=postgres`.

### itinerary_items

Descripción: componentes económicos de un itinerario (servicios y fees) usados para recalcular totales.

Campos base implementados en migración (`20260304_004_itinerary_items.sql`):

- `id` (text, PK)
- `itinerary_id` (text)
- `title` (text)
- `category` (enum lógico: flight, hotel, transfer, tour, insurance, fee, other)
- `quantity` (numeric)
- `unit_net` (numeric)
- `unit_gross` (numeric)
- `total_net` (numeric)
- `total_gross` (numeric)
- `service_fee_amount` (numeric)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

## 5) communication_logs

Descripción: bitácora unificada omnicanal.

Campos clave:
- `id` (uuid, PK)
- `client_id` (uuid, FK clients.id)
- `agent_id` (uuid, FK users.id, nullable)
- `channel` (enum: whatsapp, email, sms, internal_note)
- `direction` (enum: inbound, outbound)
- `content` (text)
- `status` (enum: sent, delivered, read, replied)
- `metadata_json` (jsonb)
- `thread_id` (uuid)

---

## 6) commissions

Descripción: seguimiento de comisiones esperadas/recibidas.

Campos clave:
- `id` (uuid, PK)
- `itinerary_id` (uuid, FK itineraries.id)
- `supplier_id` (uuid, FK suppliers.id)
- `expected_amount` (numeric)
- `actual_received` (numeric, nullable)
- `received_date` (date, nullable)
- `due_date` (date)
- `status` (enum: unclaimed, claimed, paid, disputed)

---

## 7) financial_transactions

Descripción: ledger financiero multicurrency.

Campos clave:
- `id` (uuid, PK)
- `itinerary_id` (uuid, FK itineraries.id)
- `type` (enum: supplier_payment, client_receipt, service_fee)
- `amount_original` (numeric)
- `currency_original` (char(3))
- `exchange_rate` (numeric)
- `amount_mxn` (numeric)
- `status` (enum: pending, cleared, cancelled)
- `transaction_date` (date)

---

## 8) authorization_audit

Descripción: seguridad, roles y trazabilidad.

Tablas sugeridas:
- `users` (id, name, email, role)
- `roles` (owner, manager, agent, accountant, external_dmc)
- `permissions` (matriz por acción/recurso)
- `audit_events` (actor_id, action, resource, resource_id, before_json, after_json, event_at)

Campos base implementados en migración inicial (`20260303_001_init_core.sql`):

- `roles`
	- `id` (uuid, PK)
	- `code` (text, único)
	- `name_es_mx` (text)
	- `name_en_us` (text)
- `users`
	- `id` (uuid, PK)
	- `full_name` (text)
	- `email` (text, único)
	- `role_id` (uuid, FK roles.id)
	- `is_active` (boolean)
- `audit_events`
	- `id` (uuid, PK)
	- `actor_user_id` (uuid, FK users.id)
	- `action` (text)
	- `resource` (text)
	- `resource_id` (uuid)
	- `before_json` (jsonb)
	- `after_json` (jsonb)
	- `event_at` (timestamptz)

### auth_refresh_sessions

Descripción: almacenamiento de sesiones de refresh token para rotación y revocación centralizada.

Campos base implementados en migración (`20260303_002_auth_refresh_sessions.sql`):

- `token_hash` (text, PK)
- `user_id` (text)
- `role` (enum lógico de roles del sistema)
- `expires_at` (timestamptz)
- `revoked_at` (timestamptz, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

---

## Campos calculados / reglas derivadas

- `agency_profit = gross_total - net_total`.
- En implementación actual de items: `gross_total = sum(total_gross)`, `net_total = sum(total_net)`, `service_fee_amount = sum(service_fee_amount)` y luego `agency_profit = (gross_total - net_total) + service_fee_amount`.
- Alertas de pasaporte: expiración < 180 días.
- Alertas de cumpleaños: próximos 14 días.
- Bandera de seguimiento comisión: si `status != paid` y viaje completado + 30 días.

---

## Mantenimiento del documento

Actualizar este archivo en cada cambio de:

- Entidades o relaciones
- Nuevos campos o enums
- Reglas derivadas de negocio
- Definiciones de seguridad/compliance

## Registro de cambios

- 2026-03-03: Versión inicial creada con entidades base y convenciones.
- 2026-03-03: Se alineó diccionario con migración inicial Sprint 1 (roles, users, audit_events).
- 2026-03-03: Se agregó entidad `auth_refresh_sessions` para refresh tokens con rotación y revocación.
- 2026-03-04: Se documentó implementación inicial de `itineraries` y su migración SQL base.
- 2026-03-04: Se documentó implementación de `itinerary_items` y regla de recálculo automático de totales.
- 2026-03-04: Se documentó implementación de `financial_transactions` y su migración SQL base.
- 2026-03-04: Se documentó implementación de `communication_logs` y su migración SQL base.
