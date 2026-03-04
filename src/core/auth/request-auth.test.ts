import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserContextFromHeaders } from './request-auth';
import { permissionForClients, permissionForItineraries, permissionForLeads } from './route-permissions';

function mockRequest(headers: Record<string, string>) {
  return { headers } as { headers: Record<string, string> };
}

test('getUserContextFromHeaders returns context for valid headers', () => {
  const req = mockRequest({ 'x-user-id': 'user_1', 'x-user-role': 'agent' });
  const context = getUserContextFromHeaders(req as never);

  assert.deepEqual(context, { userId: 'user_1', role: 'agent' });
});

test('getUserContextFromHeaders returns null for invalid role', () => {
  const req = mockRequest({ 'x-user-id': 'user_1', 'x-user-role': 'invalid_role' });
  const context = getUserContextFromHeaders(req as never);

  assert.equal(context, null);
});

test('permissionForLeads maps methods correctly', () => {
  assert.equal(permissionForLeads('GET'), 'read:leads');
  assert.equal(permissionForLeads('POST'), 'write:leads');
  assert.equal(permissionForLeads('PATCH'), 'write:leads');
  assert.equal(permissionForLeads('DELETE'), null);
});

test('permissionForClients maps methods correctly', () => {
  assert.equal(permissionForClients('GET'), 'read:clients');
  assert.equal(permissionForClients('POST'), 'write:clients');
  assert.equal(permissionForClients('PATCH'), 'write:clients');
  assert.equal(permissionForClients('DELETE'), null);
});

test('permissionForItineraries maps methods correctly', () => {
  assert.equal(permissionForItineraries('GET'), 'read:itineraries');
  assert.equal(permissionForItineraries('POST'), 'write:itineraries');
  assert.equal(permissionForItineraries('PATCH'), 'write:itineraries');
  assert.equal(permissionForItineraries('DELETE'), null);
});
