import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiServer } from '../app';
import type { AuthMode } from '../core/auth/request-auth';
import { InMemoryLeadRepository } from '../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { InMemorySupplierRepository } from '../modules/suppliers/infrastructure/in-memory-supplier-repository';
import { InMemoryCommissionRepository } from '../modules/commissions/infrastructure/in-memory-commission-repository';
import { InMemoryFinancialRepository } from '../modules/financials/infrastructure/in-memory-financial-repository';
import { InMemoryMessagingRepository } from '../modules/messaging/infrastructure/in-memory-messaging-repository';
import { InMemoryDashboardRepository } from '../modules/dashboard/infrastructure/in-memory-dashboard-repository';
import { InMemoryManagementRepository } from '../modules/management/infrastructure/in-memory-management-repository';

export function integrationTestHeaders(
  role = 'agent',
  locale = 'es-MX',
  userId = 'user_test',
  contentType = 'application/json'
): Record<string, string> {
  return {
    'content-type': contentType,
    'x-user-id': userId,
    'x-user-role': role,
    'x-locale': locale
  };
}

export async function startIntegrationServer(authMode: AuthMode = 'header'): Promise<{ server: Server; baseUrl: string }> {
  const server = createApiServer({
    leads: new InMemoryLeadRepository(),
    clients: new InMemoryClientRepository(),
    suppliers: new InMemorySupplierRepository(),
    commissions: new InMemoryCommissionRepository(),
    financials: new InMemoryFinancialRepository(),
    messaging: new InMemoryMessagingRepository(),
    itineraries: new InMemoryItineraryRepository(),
    dashboard: new InMemoryDashboardRepository(),
    management: new InMemoryManagementRepository()
  }, { authMode });

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

export async function stopIntegrationServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function issueIntegrationTokenPair(
  baseUrl: string,
  role = 'agent',
  locale = 'es-MX',
  userId = 'user_test'
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${baseUrl}/auth/token`, {
    method: 'POST',
    headers: integrationTestHeaders(role, locale, userId)
  });

  if (response.status !== 200) {
    const body = await response.text();
    throw new Error(`issueIntegrationTokenPair failed: expected 200, got ${response.status}. Body: ${body}`);
  }

  const payload = (await response.json()) as {
    data?: { accessToken?: string; refreshToken?: string };
  };

  const accessToken = payload.data?.accessToken;
  const refreshToken = payload.data?.refreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error('issueIntegrationTokenPair failed: token pair missing in response');
  }

  return { accessToken, refreshToken };
}

export function bearerHeaders(accessToken: string, locale = 'es-MX'): Record<string, string> {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-locale': locale
  };
}
