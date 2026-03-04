import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCreateMessage, validateUpdateMessage } from './messaging-validation';

test('validateCreateMessage succeeds with required fields', () => {
  const payload = {
    clientId: 'client_1',
    channel: 'whatsapp',
    direction: 'outbound',
    content: 'Hola, comparto propuesta',
    threadId: 'thread_1'
  };

  const result = validateCreateMessage(payload);
  assert.equal(result.ok, true);
});

test('validateCreateMessage fails with missing fields', () => {
  const result = validateCreateMessage({ content: 'incompleto' });
  assert.equal(result.ok, false);
});

test('validateUpdateMessage rejects invalid status', () => {
  const result = validateUpdateMessage({ status: 'bad_status' });
  assert.equal(result.ok, false);
});
