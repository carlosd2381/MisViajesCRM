import { integrationTestHeaders, startIntegrationServer, stopIntegrationServer } from './test-harness';

export function testHeaders(role = 'owner'): Record<string, string> {
  return integrationTestHeaders(role);
}

export const startServer = startIntegrationServer;
export const stopServer = stopIntegrationServer;
