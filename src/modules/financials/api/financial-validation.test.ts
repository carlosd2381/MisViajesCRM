import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCreateFinancialTransaction,
  validateUpdateFinancialTransaction
} from './financial-validation';

test('validateCreateFinancialTransaction succeeds with required fields', () => {
  const payload = {
    itineraryId: 'it_1',
    type: 'client_receipt',
    amountOriginal: 1000,
    currencyOriginal: 'USD',
    exchangeRate: 17.1,
    transactionDate: '2026-04-15'
  };

  const result = validateCreateFinancialTransaction(payload);
  assert.equal(result.ok, true);
});

test('validateCreateFinancialTransaction fails with invalid exchangeRate', () => {
  const result = validateCreateFinancialTransaction({
    itineraryId: 'it_1',
    type: 'client_receipt',
    amountOriginal: 1000,
    currencyOriginal: 'USD',
    exchangeRate: 0,
    transactionDate: '2026-04-15'
  });

  assert.equal(result.ok, false);
});

test('validateUpdateFinancialTransaction rejects invalid status', () => {
  const result = validateUpdateFinancialTransaction({ status: 'bad_status' });
  assert.equal(result.ok, false);
});
