import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { closePgPool, pgQuery } from '../core/db/pg-client';
import {
  ACTOR_USER_ID,
  actorHeaders,
  cleanupLeadArtifacts,
  ensureAuditActorUser,
  hasRequiredPostgresEnv,
  isAuditSchemaReady,
  setEnv,
  startPostgresServer,
  stopServer
} from './http.postgres.test-helpers';

test('lead create and update persist audit events in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');

  let createdLeadId: string | null = null;
  let server: Server | null = null;

  try {
    if (!(await isAuditSchemaReady())) {
      t.skip('Postgres schema is not initialized (audit_events/leads/clients missing)');
      return;
    }

    await ensureAuditActorUser();

    const started = await startPostgresServer();
    server = started.server;

    const createLeadResponse = await fetch(`${started.baseUrl}/leads`, {
      method: 'POST',
      headers: actorHeaders('agent'),
      body: JSON.stringify({
        status: 'new',
        source: 'referral',
        priority: 'medium',
        destination: 'Lisboa',
        adultsCount: 2,
        childrenCount: 1
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };
    createdLeadId = createdLead.data.id;

    const updateLeadResponse = await fetch(`${started.baseUrl}/leads/${createdLeadId}`, {
      method: 'PATCH',
      headers: actorHeaders('agent'),
      body: JSON.stringify({
        destination: 'Oporto',
        adultsCount: 3
      })
    });

    assert.equal(updateLeadResponse.status, 200);

    const createAuditResult = await pgQuery<{
      actor_user_id: string | null;
      lead_id: string | null;
      before_id: string | null;
      destination: string | null;
    }>(
      `
        select
          actor_user_id::text,
          after_json->>'id' as lead_id,
          before_json->>'id' as before_id,
          after_json->>'destination' as destination
        from audit_events
        where action = 'lead.create'
          and resource = 'leads'
          and after_json->>'id' = $1
        order by event_at desc
        limit 1
      `,
      [createdLeadId]
    );

    assert.equal(createAuditResult.rowCount, 1);
    assert.equal(createAuditResult.rows[0].actor_user_id, ACTOR_USER_ID);
    assert.equal(createAuditResult.rows[0].lead_id, createdLeadId);
    assert.equal(createAuditResult.rows[0].before_id, null);
    assert.equal(createAuditResult.rows[0].destination, 'Lisboa');

    const updateAuditResult = await pgQuery<{
      actor_user_id: string | null;
      lead_id: string | null;
      before_destination: string | null;
      after_destination: string | null;
      before_adults: string | null;
      after_adults: string | null;
    }>(
      `
        select
          actor_user_id::text,
          after_json->>'id' as lead_id,
          before_json->>'destination' as before_destination,
          after_json->>'destination' as after_destination,
          before_json->>'adultsCount' as before_adults,
          after_json->>'adultsCount' as after_adults
        from audit_events
        where action = 'lead.update'
          and resource = 'leads'
          and after_json->>'id' = $1
        order by event_at desc
        limit 1
      `,
      [createdLeadId]
    );

    assert.equal(updateAuditResult.rowCount, 1);
    assert.equal(updateAuditResult.rows[0].actor_user_id, ACTOR_USER_ID);
    assert.equal(updateAuditResult.rows[0].lead_id, createdLeadId);
    assert.equal(updateAuditResult.rows[0].before_destination, 'Lisboa');
    assert.equal(updateAuditResult.rows[0].after_destination, 'Oporto');
    assert.equal(updateAuditResult.rows[0].before_adults, '2');
    assert.equal(updateAuditResult.rows[0].after_adults, '3');
  } finally {
    if (server) {
      await stopServer(server);
    }

    if (createdLeadId) {
      await cleanupLeadArtifacts(createdLeadId);
    }

    await closePgPool();
    restoreStorageMode();
  }
});

test('lead convert persists audit event in postgres mode', async (t: TestContext) => {
  if (!hasRequiredPostgresEnv()) {
    t.skip('Postgres env vars are not configured');
    return;
  }

  const restoreStorageMode = setEnv('STORAGE_MODE', 'postgres');

  let createdLeadId: string | null = null;
  let server: Server | null = null;

  try {
    if (!(await isAuditSchemaReady())) {
      t.skip('Postgres schema is not initialized (audit_events/leads/clients missing)');
      return;
    }

    await ensureAuditActorUser();

    const started = await startPostgresServer();
    server = started.server;

    const createLeadResponse = await fetch(`${started.baseUrl}/leads`, {
      method: 'POST',
      headers: actorHeaders('agent'),
      body: JSON.stringify({
        status: 'new',
        source: 'website',
        priority: 'high',
        destination: 'Cartagena',
        adultsCount: 2,
        childrenCount: 0
      })
    });

    assert.equal(createLeadResponse.status, 201);
    const createdLead = (await createLeadResponse.json()) as { data: { id: string } };
    createdLeadId = createdLead.data.id;

    const convertResponse = await fetch(`${started.baseUrl}/leads/${createdLeadId}/convert`, {
      method: 'POST',
      headers: actorHeaders('agent'),
      body: JSON.stringify({
        firstName: 'Postgres',
        paternalLastName: 'Audit',
        contacts: [{ type: 'email', value: 'postgres.audit@example.com' }]
      })
    });

    assert.equal(convertResponse.status, 201);

    const auditResult = await pgQuery<{
      actor_user_id: string | null;
      lead_id: string | null;
      client_lead_id: string | null;
    }>(
      `
        select
          actor_user_id::text,
          after_json->'lead'->>'id' as lead_id,
          after_json->'client'->>'leadId' as client_lead_id
        from audit_events
        where action = 'lead.convert'
          and resource = 'leads'
          and after_json->'lead'->>'id' = $1
        order by event_at desc
        limit 1
      `,
      [createdLeadId]
    );

    assert.equal(auditResult.rowCount, 1);
    const auditRow = auditResult.rows[0];
    assert.equal(auditRow.actor_user_id, ACTOR_USER_ID);
    assert.equal(auditRow.lead_id, createdLeadId);
    assert.equal(auditRow.client_lead_id, createdLeadId);
  } finally {
    if (server) {
      await stopServer(server);
    }

    if (createdLeadId) {
      await cleanupLeadArtifacts(createdLeadId);
    }

    await closePgPool();
    restoreStorageMode();
  }
});
