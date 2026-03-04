import test from 'node:test';
import assert from 'node:assert/strict';
import { getUserContextFromHeaders } from './request-auth';
import {
  permissionForCommissions,
  permissionForClients,
  permissionForDashboard,
  permissionForFinancials,
  permissionForItineraries,
  permissionForLeads,
  permissionForMessaging,
  permissionForSuppliers
} from './route-permissions';

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

test('permissionForSuppliers maps methods correctly', () => {
  assert.equal(permissionForSuppliers('GET'), 'read:suppliers');
  assert.equal(permissionForSuppliers('POST'), 'write:suppliers');
  assert.equal(permissionForSuppliers('PATCH'), 'write:suppliers');
  assert.equal(permissionForSuppliers('DELETE'), null);
});

test('permissionForCommissions maps methods correctly', () => {
  assert.equal(permissionForCommissions('GET'), 'read:commissions');
  assert.equal(permissionForCommissions('POST'), 'reconcile:commissions');
  assert.equal(permissionForCommissions('PATCH'), 'reconcile:commissions');
  assert.equal(permissionForCommissions('DELETE'), null);
});

test('permissionForFinancials maps methods correctly', () => {
  assert.equal(permissionForFinancials('GET'), 'read:financials');
  assert.equal(permissionForFinancials('POST'), 'write:financials');
  assert.equal(permissionForFinancials('PATCH'), 'write:financials');
  assert.equal(permissionForFinancials('DELETE'), null);
});

test('permissionForMessaging maps methods correctly', () => {
  assert.equal(permissionForMessaging('GET'), 'read:messaging');
  assert.equal(permissionForMessaging('POST'), 'write:messaging');
  assert.equal(permissionForMessaging('PATCH'), 'write:messaging');
  assert.equal(permissionForMessaging('DELETE'), null);
});

test('permissionForDashboard maps methods correctly', () => {
  assert.equal(permissionForDashboard('GET'), 'read:dashboard');
  assert.equal(permissionForDashboard('POST'), 'write:dashboard');
  assert.equal(permissionForDashboard('PATCH'), 'write:dashboard');
  assert.equal(permissionForDashboard('DELETE'), null);
});
