import type { RequestContext } from '../../../core/http/http-types';
import { readJsonBody, sendJson } from '../../../core/http/http-utils';
import type { SupplierRepository } from '../domain/supplier-repository';
import { mapCreateSupplierToEntity, mapUpdateSupplierToEntity } from '../application/supplier-service';
import { validateCreateSupplier, validateUpdateSupplier } from './supplier-validation';

export async function handleSuppliersCollection(context: RequestContext, repository: SupplierRepository): Promise<void> {
  if (context.req.method === 'GET') {
    const data = await repository.list();
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Listado de proveedores') });
    return;
  }

  if (context.req.method === 'POST') {
    const payload = await readJsonBody(context.req);
    const validation = validateCreateSupplier(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const entity = mapCreateSupplierToEntity(validation.value);
    const data = await repository.create(entity);
    sendJson(context.res, 201, { data, message: messageByLocale(context.locale, 'Proveedor creado') });
    return;
  }

  sendJson(context.res, 405, { message: messageByLocale(context.locale, 'Método no permitido') });
}

export async function handleSupplierResource(context: RequestContext, repository: SupplierRepository): Promise<void> {
  const supplierId = context.pathSegments[1];
  const existing = await repository.getById(supplierId);

  if (!existing) {
    sendJson(context.res, 404, { message: messageByLocale(context.locale, 'Proveedor no encontrado') });
    return;
  }

  if (context.req.method === 'GET') {
    sendJson(context.res, 200, { data: existing });
    return;
  }

  if (context.req.method === 'PATCH') {
    const payload = await readJsonBody(context.req);
    const validation = validateUpdateSupplier(payload);
    if (!validation.ok) {
      sendJson(context.res, 400, { message: messageByLocale(context.locale, 'Solicitud inválida'), errors: validation.errors });
      return;
    }

    const updated = mapUpdateSupplierToEntity(existing, validation.value);
    const data = await repository.update(updated);
    sendJson(context.res, 200, { data, message: messageByLocale(context.locale, 'Proveedor actualizado') });
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
    'Listado de proveedores': 'Suppliers listed',
    'Proveedor creado': 'Supplier created',
    'Proveedor no encontrado': 'Supplier not found',
    'Proveedor actualizado': 'Supplier updated',
    'Solicitud inválida': 'Invalid request',
    'Método no permitido': 'Method not allowed'
  };

  return map[spanish] ?? 'Operation completed';
}
