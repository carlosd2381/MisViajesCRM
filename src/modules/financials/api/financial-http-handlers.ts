import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { FinancialRepository } from '../domain/financial-repository';
import {
  mapCreateFinancialTransactionToEntity,
  mapUpdateFinancialTransactionToEntity
} from '../application/financial-service';
import {
  validateCreateFinancialTransaction,
  validateUpdateFinancialTransaction
} from './financial-validation';

export async function handleFinancialsCollection(context: RequestContext, repository: FinancialRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de movimientos financieros') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateFinancialTransaction(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateFinancialTransactionToEntity(validation.value);
    const data = await repository.create(entity);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Movimiento financiero creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleFinancialResource(context: RequestContext, repository: FinancialRepository): Promise<void> {
  const transactionId = context.pathSegments[1];
  const existing = await repository.getById(transactionId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Movimiento financiero no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateFinancialTransaction(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateFinancialTransactionToEntity(existing, validation.value);
    const data = await repository.update(updated);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Movimiento financiero actualizado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

function messageByLocale(locale: string, spanish: string): string {
  if (locale === 'es-MX') return spanish;
  return englishMessage(spanish);
}

function englishMessage(spanish: string): string {
  const map: Record<string, string> = {
    'Listado de movimientos financieros': 'Financial transactions listed',
    'Movimiento financiero creado': 'Financial transaction created',
    'Movimiento financiero no encontrado': 'Financial transaction not found',
    'Movimiento financiero actualizado': 'Financial transaction updated',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
