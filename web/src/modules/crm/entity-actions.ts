import { apiRequest } from './api';
import { t } from './i18n';
import { deleteConflictMessage, requestCascadeDeleteConfirmation, responseMessage } from './app-utils';
import { trackLeadConvertTelemetry } from './telemetry';
import type { DeleteRowError } from './app-types';
import type { Client, Lead, Locale, Supplier } from './types';
import type { Dispatch, SetStateAction } from 'react';

interface LeadActionsDeps {
  locale: Locale;
  leads: Lead[];
  selectedLeadId: string | null;
  editingLeadId: string | null;
  leadForm: {
    status: string;
    firstName: string;
    paternalLastName: string;
    email: string;
    phone: string;
    destination: string;
    travelStartDate: string;
    adultsCount: number;
    childrenCount: number;
    estimatedBudgetMin: string;
    estimatedBudgetMax: string;
    urgencyTimeframe: string;
    tripOccasion: string;
    campaignId: string;
    referralName: string;
    assignedAgentName: string;
    lastContactDate: string;
    probabilityOfSale: number;
    leadTemperature: string;
    dateFlexibility: string;
    preferredContactMethod: string;
    serviceTypes: string[];
    preferences: string;
    additionalComments: string;
    source: string;
    priority: string;
  };
  convertForm: { firstName: string; paternalLastName: string; email: string; phone: string };
  authHeaders: (includeJsonContentType?: boolean) => Record<string, string>;
  loadLeads: () => Promise<void>;
  loadClients: () => Promise<void>;
  setLeadForm: Dispatch<SetStateAction<{
    status: string;
    firstName: string;
    paternalLastName: string;
    email: string;
    phone: string;
    destination: string;
    travelStartDate: string;
    adultsCount: number;
    childrenCount: number;
    estimatedBudgetMin: string;
    estimatedBudgetMax: string;
    urgencyTimeframe: string;
    tripOccasion: string;
    campaignId: string;
    referralName: string;
    assignedAgentName: string;
    lastContactDate: string;
    probabilityOfSale: number;
    leadTemperature: string;
    dateFlexibility: string;
    preferredContactMethod: string;
    serviceTypes: string[];
    preferences: string;
    additionalComments: string;
    source: string;
    priority: string;
  }>>;
  setSelectedLeadId: Dispatch<SetStateAction<string | null>>;
  setEditingLeadId: Dispatch<SetStateAction<string | null>>;
  setPendingDeleteLeadId: Dispatch<SetStateAction<string | null>>;
  setLeadDeleteError: Dispatch<SetStateAction<DeleteRowError | null>>;
  setLeadResult: Dispatch<SetStateAction<string>>;
  setConvertResult: Dispatch<SetStateAction<string>>;
  setLastClientId: Dispatch<SetStateAction<string>>;
  setStatusWarn: Dispatch<SetStateAction<boolean>>;
  setStatusConflict: Dispatch<SetStateAction<boolean>>;
  setStatusText: Dispatch<SetStateAction<string>>;
}

export function createLeadActions(deps: LeadActionsDeps) {
  const {
    locale,
    leads,
    selectedLeadId,
    editingLeadId,
    leadForm,
    convertForm,
    authHeaders,
    loadLeads,
    loadClients,
    setLeadForm,
    setSelectedLeadId,
    setEditingLeadId,
    setPendingDeleteLeadId,
    setLeadDeleteError,
    setLeadResult,
    setConvertResult,
    setLastClientId,
    setStatusWarn,
    setStatusConflict,
    setStatusText
  } = deps;

  function parseServiceTypes(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw.split(',').map((item) => item.trim()).filter((item) => item.length > 0);
  }

  async function saveLead(): Promise<'created' | 'updated' | null> {
    const payload = {
      status: leadForm.status,
      source: leadForm.source,
      priority: leadForm.priority,
      firstName: leadForm.firstName,
      paternalLastName: leadForm.paternalLastName,
      email: leadForm.email,
      phone: leadForm.phone,
      destination: leadForm.destination,
      travelStartDate: leadForm.travelStartDate || undefined,
      adultsCount: leadForm.adultsCount,
      childrenCount: leadForm.childrenCount,
      budgetMin: leadForm.estimatedBudgetMin.trim() ? Number(leadForm.estimatedBudgetMin) : undefined,
      budgetMax: leadForm.estimatedBudgetMax.trim() ? Number(leadForm.estimatedBudgetMax) : undefined,
      urgencyTimeframe: leadForm.urgencyTimeframe || undefined,
      tripOccasion: leadForm.tripOccasion || undefined,
      campaignId: leadForm.campaignId || undefined,
      referralName: leadForm.referralName || undefined,
      assignedAgentName: leadForm.assignedAgentName || undefined,
      lastContactDate: leadForm.lastContactDate || undefined,
      probabilityOfSale: leadForm.probabilityOfSale,
      leadTemperature: leadForm.leadTemperature || undefined,
      dateFlexibility: leadForm.dateFlexibility || undefined,
      preferredContactMethod: leadForm.preferredContactMethod || undefined,
      tripType: leadForm.serviceTypes.join(', '),
      preferences: leadForm.preferences,
      notes: leadForm.additionalComments
    };

    const request = await apiRequest<Lead>(editingLeadId ? `/leads/${editingLeadId}` : '/leads', {
      method: editingLeadId ? 'PATCH' : 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload)
    });
    setLeadResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) return null;
    if (request.data?.id) {
      setSelectedLeadId(request.data.id);
      setEditingLeadId(null);
    }
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(editingLeadId ? t(locale, 'status.leadUpdated') : t(locale, 'status.leadSaved'));
    await loadLeads();
    return editingLeadId ? 'updated' : 'created';
  }

  function startCreateLead(): void {
    setEditingLeadId(null);
    setLeadForm({
      firstName: '',
      paternalLastName: '',
      email: '',
      phone: '',
      status: 'new',
      destination: '',
      travelStartDate: '',
      adultsCount: 1,
      childrenCount: 0,
      estimatedBudgetMin: '',
      estimatedBudgetMax: '',
      urgencyTimeframe: 'just_browsing',
      tripOccasion: '',
      campaignId: '',
      referralName: '',
      assignedAgentName: '',
      lastContactDate: '',
      probabilityOfSale: 50,
      leadTemperature: 'warm',
      dateFlexibility: 'flexible',
      preferredContactMethod: 'whatsapp',
      serviceTypes: [],
      preferences: '',
      additionalComments: '',
      source: 'website',
      priority: 'high'
    });
  }

  function startEditLead(leadId: string): void {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;
    setSelectedLeadId(leadId);
    setEditingLeadId(leadId);
    setLeadForm({
      firstName: lead.firstName ?? '',
      paternalLastName: lead.paternalLastName ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      status: lead.status,
      destination: lead.destination,
      travelStartDate: lead.travelStartDate ?? '',
      adultsCount: lead.adultsCount ?? 1,
      childrenCount: lead.childrenCount ?? 0,
      estimatedBudgetMin: lead.budgetMin !== undefined ? String(lead.budgetMin) : '',
      estimatedBudgetMax: lead.budgetMax !== undefined ? String(lead.budgetMax) : '',
      urgencyTimeframe: lead.urgencyTimeframe ?? 'just_browsing',
      tripOccasion: lead.tripOccasion ?? '',
      campaignId: lead.campaignId ?? '',
      referralName: lead.referralName ?? '',
      assignedAgentName: lead.assignedAgentName ?? '',
      lastContactDate: lead.lastContactDate ?? '',
      probabilityOfSale: lead.probabilityOfSale ?? 50,
      leadTemperature: lead.leadTemperature ?? 'warm',
      dateFlexibility: lead.dateFlexibility ?? 'flexible',
      preferredContactMethod: lead.preferredContactMethod ?? 'whatsapp',
      serviceTypes: parseServiceTypes(lead.tripType),
      preferences: lead.preferences ?? '',
      additionalComments: lead.notes ?? '',
      source: lead.source,
      priority: lead.priority
    });
  }

  function cancelLeadEdit(): void {
    setEditingLeadId(null);
  }

  async function deleteLead(leadId: string): Promise<void> {
    const request = await apiRequest<Lead>(`/leads/${leadId}`, { method: 'DELETE', headers: authHeaders() });
    setLeadResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      const message = request.status === 409 ? deleteConflictMessage(locale, 'lead') : responseMessage(request.raw, t(locale, 'status.deleteUnavailable'));
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(message);
      setLeadDeleteError(request.status === 409 ? { id: leadId, message } : null);
      return;
    }
    setPendingDeleteLeadId(null);
    setLeadDeleteError(null);
    if (selectedLeadId === leadId) setSelectedLeadId(null);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.apiReady')));
    await loadLeads();
  }

  async function forceDeleteLead(leadId: string): Promise<void> {
    const confirmation = requestCascadeDeleteConfirmation(locale);
    if (!confirmation) return;
    const request = await apiRequest<Lead>(`/leads/${leadId}?cascade=true`, {
      method: 'DELETE', headers: authHeaders(true), body: JSON.stringify({ confirmation })
    });
    setLeadResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      const message = responseMessage(request.raw, t(locale, 'status.deleteUnavailable'));
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(message);
      setLeadDeleteError({ id: leadId, message });
      return;
    }
    setPendingDeleteLeadId(null);
    setLeadDeleteError(null);
    if (selectedLeadId === leadId) setSelectedLeadId(null);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.apiReady')));
    await loadLeads();
  }

  async function convertLead(signal?: AbortSignal): Promise<string | null> {
    const startedAt = Date.now();
    if (!selectedLeadId || !convertForm.firstName.trim() || !convertForm.paternalLastName.trim() || !convertForm.email.trim()) {
      trackLeadConvertTelemetry({
        phase: 'invalid',
        leadId: selectedLeadId ?? undefined,
        durationMs: Date.now() - startedAt,
        reason: 'missing_required_fields'
      });
      setStatusWarn(true);
      setStatusConflict(false);
      setStatusText(t(locale, 'leads.convertMissingFields'));
      return null;
    }

    trackLeadConvertTelemetry({ phase: 'start', leadId: selectedLeadId });

    const contacts: Array<{ type: 'email' | 'cell'; value: string }> = [{ type: 'email', value: convertForm.email }];
    if (convertForm.phone.trim()) {
      contacts.push({ type: 'cell', value: convertForm.phone.trim() });
    }

    let request: Awaited<ReturnType<typeof apiRequest<{ client: Client }>>>;
    try {
      request = await apiRequest<{ client: Client }>(`/leads/${selectedLeadId}/convert`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          firstName: convertForm.firstName,
          paternalLastName: convertForm.paternalLastName,
          contacts
        }),
        signal
      });
    } catch (error) {
      const maybeAbortError = error as { name?: string };
      if (maybeAbortError?.name === 'AbortError') {
        trackLeadConvertTelemetry({
          phase: 'abort',
          leadId: selectedLeadId,
          durationMs: Date.now() - startedAt,
          reason: 'request_aborted'
        });
        setStatusWarn(true);
        setStatusConflict(false);
        setStatusText(t(locale, 'status.leadConvertTimedOut'));
        return null;
      }
      trackLeadConvertTelemetry({
        phase: 'fail',
        leadId: selectedLeadId,
        durationMs: Date.now() - startedAt,
        reason: 'unexpected_error'
      });
      throw error;
    }
    setConvertResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      trackLeadConvertTelemetry({
        phase: 'fail',
        leadId: selectedLeadId,
        statusCode: request.status,
        durationMs: Date.now() - startedAt,
        reason: responseMessage(request.raw, t(locale, 'status.leadConvertFailed'))
      });
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(responseMessage(request.raw, t(locale, 'status.leadConvertFailed')));
      return null;
    }
    const maybeClientId = (request.raw as { data?: { client?: { id?: string } } })?.data?.client?.id;
    trackLeadConvertTelemetry({
      phase: 'success',
      leadId: selectedLeadId,
      clientId: maybeClientId,
      statusCode: request.status,
      durationMs: Date.now() - startedAt
    });
    if (maybeClientId) setLastClientId(maybeClientId);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.leadConverted')));
    await Promise.all([loadLeads(), loadClients()]);
    return maybeClientId ?? null;
  }

  return { saveLead, startCreateLead, startEditLead, cancelLeadEdit, deleteLead, forceDeleteLead, convertLead };
}

interface SupplierActionsDeps {
  locale: Locale;
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  editingSupplierId: string | null;
  supplierForm: {
    name: string;
    tradeName: string;
    type: string;
    serviceModel: string;
    marketFocusTags: string[];
    tierLevel: string;
    rfc: string;
    billingAddress: string;
    status: string;
    defaultCurrency: 'MXN' | 'USD' | 'EUR';
    commissionType: string;
    commissionRate: number;
    payoutTerms: string;
    contractExpiryDate: string;
    blackoutDates: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    internalRating: number;
    responseTimeScore: number;
    internalRiskFlag: string;
  };
  authHeaders: (includeJsonContentType?: boolean) => Record<string, string>;
  loadSuppliers: () => Promise<void>;
  setSelectedSupplierId: Dispatch<SetStateAction<string | null>>;
  setEditingSupplierId: Dispatch<SetStateAction<string | null>>;
  setPendingDeleteSupplierId: Dispatch<SetStateAction<string | null>>;
  setSupplierDeleteError: Dispatch<SetStateAction<DeleteRowError | null>>;
  setSupplierForm: Dispatch<SetStateAction<{
    name: string;
    tradeName: string;
    type: string;
    serviceModel: string;
    marketFocusTags: string[];
    tierLevel: string;
    rfc: string;
    billingAddress: string;
    status: string;
    defaultCurrency: 'MXN' | 'USD' | 'EUR';
    commissionType: string;
    commissionRate: number;
    payoutTerms: string;
    contractExpiryDate: string;
    blackoutDates: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    internalRating: number;
    responseTimeScore: number;
    internalRiskFlag: string;
  }>>;
  setSupplierResult: Dispatch<SetStateAction<string>>;
  setStatusWarn: Dispatch<SetStateAction<boolean>>;
  setStatusConflict: Dispatch<SetStateAction<boolean>>;
  setStatusText: Dispatch<SetStateAction<string>>;
}

export function createSupplierActions(deps: SupplierActionsDeps) {
  const {
    locale,
    suppliers,
    selectedSupplierId,
    editingSupplierId,
    supplierForm,
    authHeaders,
    loadSuppliers,
    setSelectedSupplierId,
    setEditingSupplierId,
    setPendingDeleteSupplierId,
    setSupplierDeleteError,
    setSupplierForm,
    setSupplierResult,
    setStatusWarn,
    setStatusConflict,
    setStatusText
  } = deps;

  function startCreateSupplier(): void {
    setEditingSupplierId(null);
    setSupplierForm({
      name: '',
      tradeName: '',
      type: 'hotel',
      serviceModel: 'private',
      marketFocusTags: [],
      tierLevel: 'silver',
      rfc: '',
      billingAddress: '',
      status: 'active',
      defaultCurrency: 'MXN',
      commissionType: 'percentage',
      commissionRate: 10,
      payoutTerms: 'upon_booking',
      contractExpiryDate: '',
      blackoutDates: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      internalRating: 4,
      responseTimeScore: 80,
      internalRiskFlag: 'reliable'
    });
  }

  function viewSupplier(supplierId: string): void {
    setSelectedSupplierId(supplierId);
  }

  function startEditSupplier(supplierId: string): void {
    const supplier = suppliers.find((item) => item.id === supplierId);
    if (!supplier) return;
    setSelectedSupplierId(supplierId);
    setEditingSupplierId(supplierId);
    setSupplierForm({
      name: supplier.name,
      tradeName: supplier.tradeName ?? '',
      type: supplier.type,
      serviceModel: supplier.serviceModel ?? 'private',
      marketFocusTags: supplier.marketFocusTags ?? [],
      tierLevel: supplier.tierLevel ?? 'silver',
      rfc: supplier.rfc ?? '',
      billingAddress: supplier.billingAddress ?? '',
      status: supplier.status,
      defaultCurrency: supplier.defaultCurrency,
      commissionType: supplier.commissionType,
      commissionRate: supplier.commissionRate,
      payoutTerms: supplier.payoutTerms,
      contractExpiryDate: supplier.contractExpiryDate ?? '',
      blackoutDates: supplier.blackoutDates ?? '',
      emergencyContactName: supplier.emergencyContactName ?? '',
      emergencyContactPhone: supplier.emergencyContactPhone ?? '',
      internalRating: supplier.internalRating ?? 4,
      responseTimeScore: supplier.responseTimeScore ?? 80,
      internalRiskFlag: supplier.internalRiskFlag
    });
  }

  function cancelSupplierEdit(): void {
    setEditingSupplierId(null);
  }

  async function saveSupplier(): Promise<void> {
    const payload = {
      name: supplierForm.name.trim(),
      tradeName: supplierForm.tradeName.trim() || undefined,
      type: supplierForm.type,
      serviceModel: supplierForm.serviceModel || undefined,
      marketFocusTags: supplierForm.marketFocusTags,
      tierLevel: supplierForm.tierLevel || undefined,
      rfc: supplierForm.rfc.trim() || undefined,
      billingAddress: supplierForm.billingAddress.trim() || undefined,
      status: supplierForm.status,
      defaultCurrency: supplierForm.defaultCurrency,
      commissionType: supplierForm.commissionType,
      commissionRate: supplierForm.commissionRate,
      payoutTerms: supplierForm.payoutTerms,
      contractExpiryDate: supplierForm.contractExpiryDate || undefined,
      blackoutDates: supplierForm.blackoutDates.trim() || undefined,
      emergencyContactName: supplierForm.emergencyContactName.trim() || undefined,
      emergencyContactPhone: supplierForm.emergencyContactPhone.trim() || undefined,
      internalRating: supplierForm.internalRating,
      responseTimeScore: supplierForm.responseTimeScore,
      internalRiskFlag: supplierForm.internalRiskFlag
    };
    const request = await apiRequest<Supplier>(editingSupplierId ? `/suppliers/${editingSupplierId}` : '/suppliers', {
      method: editingSupplierId ? 'PATCH' : 'POST', headers: authHeaders(true), body: JSON.stringify(payload)
    });
    setSupplierResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) return;
    setEditingSupplierId(null);
    if (request.data?.id) setSelectedSupplierId(request.data.id);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(editingSupplierId ? t(locale, 'status.supplierUpdated') : t(locale, 'status.supplierSaved'));
    await loadSuppliers();
  }

  async function deleteSupplier(supplierId: string): Promise<void> {
    const request = await apiRequest<Supplier>(`/suppliers/${supplierId}`, { method: 'DELETE', headers: authHeaders() });
    setSupplierResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      const message = request.status === 409 ? deleteConflictMessage(locale, 'supplier') : responseMessage(request.raw, t(locale, 'status.deleteUnavailable'));
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(message);
      setSupplierDeleteError(request.status === 409 ? { id: supplierId, message } : null);
      return;
    }
    setPendingDeleteSupplierId(null);
    setSupplierDeleteError(null);
    if (selectedSupplierId === supplierId) setSelectedSupplierId(null);
    if (editingSupplierId === supplierId) setEditingSupplierId(null);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.apiReady')));
    await loadSuppliers();
  }

  async function forceDeleteSupplier(supplierId: string): Promise<void> {
    const confirmation = requestCascadeDeleteConfirmation(locale);
    if (!confirmation) return;
    const request = await apiRequest<Supplier>(`/suppliers/${supplierId}?cascade=true`, {
      method: 'DELETE', headers: authHeaders(true), body: JSON.stringify({ confirmation })
    });
    setSupplierResult(JSON.stringify(request.raw, null, 2));
    if (!request.ok) {
      const message = responseMessage(request.raw, t(locale, 'status.deleteUnavailable'));
      setStatusWarn(true);
      setStatusConflict(request.status === 409);
      setStatusText(message);
      setSupplierDeleteError({ id: supplierId, message });
      return;
    }
    setPendingDeleteSupplierId(null);
    setSupplierDeleteError(null);
    if (selectedSupplierId === supplierId) setSelectedSupplierId(null);
    if (editingSupplierId === supplierId) setEditingSupplierId(null);
    setStatusWarn(false);
    setStatusConflict(false);
    setStatusText(responseMessage(request.raw, t(locale, 'status.apiReady')));
    await loadSuppliers();
  }

  return {
    startCreateSupplier,
    viewSupplier,
    startEditSupplier,
    cancelSupplierEdit,
    saveSupplier,
    deleteSupplier,
    forceDeleteSupplier
  };
}