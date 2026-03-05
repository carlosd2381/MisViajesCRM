import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RepositoryBundle } from '../bootstrap/repositories';
import { authorizeRequest, type AuthMode } from '../auth/request-auth';
import {
  permissionForAi,
  permissionForCommissions,
  permissionForClients,
  permissionForDashboard,
  permissionForFinancials,
  permissionForItineraries,
  permissionForLeads,
  permissionForManagement,
  permissionForMessaging,
  permissionForSuppliers
} from '../auth/route-permissions';
import type { PermissionKey } from '../auth/permissions';
import { handleLeadConvert, handleLeadsCollection, handleLeadResource } from '../../modules/leads/api/lead-http-handlers';
import { handleClientResource, handleClientsCollection } from '../../modules/clients/api/client-http-handlers';
import {
  handleSupplierResource,
  handleSuppliersCollection
} from '../../modules/suppliers/api/supplier-http-handlers';
import {
  handleCommissionResource,
  handleCommissionsCollection
} from '../../modules/commissions/api/commission-http-handlers';
import {
  handleFinancialResource,
  handleFinancialsCollection
} from '../../modules/financials/api/financial-http-handlers';
import {
  handleMessageResource,
  handleMessagingCollection
} from '../../modules/messaging/api/messaging-http-handlers';
import {
  handleDashboardCollection,
  handleDashboardResource
} from '../../modules/dashboard/api/dashboard-http-handlers';
import {
  handleManagementCollection,
  handleManagementResource
} from '../../modules/management/api/management-http-handlers';
import {
  handleManagementCfdiInvoiceStatus,
  handleManagementCfdiReadiness,
  handleManagementCfdiEvents
} from '../../modules/management/api/management-cfdi-query-http-handlers';
import {
  handleManagementCfdiCancelValidation,
  handleManagementCfdiStampValidation
} from '../../modules/management/api/management-cfdi-validate-http-handlers';
import {
  handleManagementCfdiCancelConfirm,
  handleManagementCfdiStampConfirm
} from '../../modules/management/api/management-cfdi-transition-http-handlers';
import {
  handleManagementCfdiCertificateResource,
  handleManagementCfdiCertificatesCollection
} from '../../modules/management/api/management-cfdi-certificate-http-handlers';
import {
  handleAiMetrics,
  handleAiProposalCollection,
  handleAiProposalPdfDraft,
  handleAiProposalRenderSchema,
  handleAiProposalSchema,
  handleAiProposalWebRender
} from '../../modules/ai/api/proposal-http-handlers';
import {
  handleItineraryItemsCollection,
  handleItinerariesCollection,
  handleItineraryApprove,
  handleItineraryResource
} from '../../modules/itinerary/api/itinerary-http-handlers';

interface ModuleRouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  pathSegments: string[];
  locale: string;
  repositories: RepositoryBundle;
  authMode: AuthMode;
}

type ModuleRouteKey =
  | 'leads'
  | 'clients'
  | 'suppliers'
  | 'commissions'
  | 'financials'
  | 'messaging'
  | 'dashboard'
  | 'management'
  | 'ai'
  | 'itineraries';

export const MODULE_ROUTE_DISPATCH_ORDER: ReadonlyArray<ModuleRouteKey> = [
  'leads',
  'clients',
  'suppliers',
  'commissions',
  'financials',
  'messaging',
  'dashboard',
  'management',
  'ai',
  'itineraries'
];

function canProceed(
  req: IncomingMessage,
  res: ServerResponse,
  locale: string,
  permission: PermissionKey | null,
  authMode: AuthMode
): boolean {
  if (!permission) return false;
  return authorizeRequest(req, res, locale, permission, authMode);
}

function handleLeadsRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'leads') return null;

  const permission: PermissionKey | null =
    pathSegments.length === 3 && pathSegments[2] === 'convert' && req.method === 'POST'
      ? 'write:clients'
      : permissionForLeads(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleLeadsCollection(requestContext, repositories.leads);
  if (pathSegments.length === 2) return handleLeadResource(requestContext, repositories.leads);
  if (pathSegments.length === 3 && pathSegments[2] === 'convert') {
    return handleLeadConvert(requestContext, repositories.leads, repositories.clients);
  }
  return Promise.resolve();
}

function handleClientsRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'clients') return null;

  const permission = permissionForClients(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleClientsCollection(requestContext, repositories.clients);
  if (pathSegments.length === 2) return handleClientResource(requestContext, repositories.clients);
  return Promise.resolve();
}

function handleItinerariesRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'itineraries') return null;

  const permission: PermissionKey | null =
    pathSegments.length === 3 && pathSegments[2] === 'approve' && req.method === 'POST'
      ? 'approve:itineraries'
      : permissionForItineraries(req.method);

  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleItinerariesCollection(requestContext, repositories.itineraries);
  if (pathSegments.length === 2) return handleItineraryResource(requestContext, repositories.itineraries);
  if (pathSegments.length === 3 && pathSegments[2] === 'items') {
    return handleItineraryItemsCollection(requestContext, repositories.itineraries);
  }
  if (pathSegments.length === 3 && pathSegments[2] === 'approve') {
    return handleItineraryApprove(requestContext, repositories.itineraries);
  }

  return Promise.resolve();
}

function handleSuppliersRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'suppliers') return null;

  const permission = permissionForSuppliers(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleSuppliersCollection(requestContext, repositories.suppliers);
  if (pathSegments.length === 2) return handleSupplierResource(requestContext, repositories.suppliers);
  return Promise.resolve();
}

function handleCommissionsRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'commissions') return null;

  const permission = permissionForCommissions(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleCommissionsCollection(requestContext, repositories.commissions);
  if (pathSegments.length === 2) return handleCommissionResource(requestContext, repositories.commissions);
  return Promise.resolve();
}

function handleFinancialsRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'financials') return null;

  const permission = permissionForFinancials(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleFinancialsCollection(requestContext, repositories.financials);
  if (pathSegments.length === 2) return handleFinancialResource(requestContext, repositories.financials);
  return Promise.resolve();
}

function handleMessagingRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'messaging') return null;

  const permission = permissionForMessaging(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleMessagingCollection(requestContext, repositories.messaging);
  if (pathSegments.length === 2) return handleMessageResource(requestContext, repositories.messaging);
  return Promise.resolve();
}

function handleDashboardRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'dashboard') return null;

  const permission = permissionForDashboard(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleDashboardCollection(requestContext, repositories.dashboard);
  if (pathSegments.length === 2) return handleDashboardResource(requestContext, repositories.dashboard);
  return Promise.resolve();
}

function handleManagementRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, repositories, authMode } = context;
  if (pathSegments[0] !== 'management') return null;

  const permission = permissionForManagement(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 1) return handleManagementCollection(requestContext, repositories.management);
  if (pathSegments.length === 3 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'readiness') {
    return handleManagementCfdiReadiness(requestContext);
  }
  if (pathSegments.length === 3 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'events') {
    return handleManagementCfdiEvents(requestContext);
  }
  if (pathSegments.length === 3 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'certificates') {
    return handleManagementCfdiCertificatesCollection(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'invoices') {
    return handleManagementCfdiInvoiceStatus(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'certificates') {
    return handleManagementCfdiCertificateResource(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'stamp' && pathSegments[3] === 'validate') {
    return handleManagementCfdiStampValidation(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'stamp' && pathSegments[3] === 'confirm') {
    return handleManagementCfdiStampConfirm(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'cancel' && pathSegments[3] === 'validate') {
    return handleManagementCfdiCancelValidation(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'cfdi' && pathSegments[2] === 'cancel' && pathSegments[3] === 'confirm') {
    return handleManagementCfdiCancelConfirm(requestContext);
  }
  if (pathSegments.length === 2) return handleManagementResource(requestContext, repositories.management);
  return Promise.resolve();
}

function handleAiRoute(context: ModuleRouteContext): Promise<void> | null {
  const { req, res, pathSegments, locale, authMode } = context;
  if (pathSegments[0] !== 'ai') return null;

  const permission = permissionForAi(req.method);
  if (!canProceed(req, res, locale, permission, authMode)) return Promise.resolve();

  const requestContext = { req, res, pathSegments, locale };
  if (pathSegments.length === 2 && pathSegments[1] === 'metrics') {
    return handleAiMetrics(requestContext);
  }
  if (pathSegments.length === 2 && pathSegments[1] === 'proposal') {
    return handleAiProposalCollection(requestContext);
  }
  if (pathSegments.length === 4 && pathSegments[1] === 'proposal' && pathSegments[2] === 'render') {
    if (pathSegments[3] === 'web') return handleAiProposalWebRender(requestContext);
    if (pathSegments[3] === 'pdf') return handleAiProposalPdfDraft(requestContext);
    if (pathSegments[3] === 'schema') return handleAiProposalRenderSchema(requestContext);
  }
  if (pathSegments.length === 3 && pathSegments[1] === 'schema' && pathSegments[2] === 'proposal') {
    return handleAiProposalSchema(requestContext);
  }

  return Promise.resolve();
}

export function dispatchModuleRoute(context: ModuleRouteContext): Promise<void> | null {
  const routeHandlers: Record<ModuleRouteKey, (ctx: ModuleRouteContext) => Promise<void> | null> = {
    leads: handleLeadsRoute,
    clients: handleClientsRoute,
    suppliers: handleSuppliersRoute,
    commissions: handleCommissionsRoute,
    financials: handleFinancialsRoute,
    messaging: handleMessagingRoute,
    dashboard: handleDashboardRoute,
    management: handleManagementRoute,
    ai: handleAiRoute,
    itineraries: handleItinerariesRoute
  };

  for (const routeKey of MODULE_ROUTE_DISPATCH_ORDER) {
    const result = routeHandlers[routeKey](context);
    if (result) return result;
  }

  return null;
}
