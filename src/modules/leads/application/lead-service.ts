import { randomUUID } from 'node:crypto';
import type { CreateLeadRequest, UpdateLeadRequest } from '../api/lead-contracts';
import type { CreateClientRequest } from '../../clients/api/client-contracts';
import type { Lead } from '../domain/lead';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(): string {
  return randomUUID();
}

export function mapCreateLeadToEntity(input: CreateLeadRequest): Lead {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateLeadToEntity(current: Lead, input: UpdateLeadRequest): Lead {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}

export function mapConvertLeadToClientRequest(lead: Lead, input: CreateClientRequest): CreateClientRequest {
  const leadServiceTypes = lead.tripType
    ? lead.tripType.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
    : [];

  const leadPreferences: Record<string, string | number | boolean | string[]> = {
    leadDestination: lead.destination,
    leadStatus: lead.status,
    leadSource: lead.source,
    leadPriority: lead.priority,
    leadAdultsCount: lead.adultsCount,
    leadChildrenCount: lead.childrenCount,
    currentTripDestination: lead.destination,
    currentTripTravelers: String(lead.adultsCount + lead.childrenCount)
  };

  if (lead.budgetMin !== undefined) leadPreferences.leadBudgetMin = lead.budgetMin;
  if (lead.budgetMax !== undefined) leadPreferences.leadBudgetMax = lead.budgetMax;
  if (lead.budgetCurrency) leadPreferences.leadBudgetCurrency = lead.budgetCurrency;
  if (lead.tripType) leadPreferences.leadTripType = lead.tripType;
  if (lead.urgencyTimeframe) leadPreferences.leadUrgencyTimeframe = lead.urgencyTimeframe;
  if (lead.tripOccasion) leadPreferences.leadTripOccasion = lead.tripOccasion;
  if (lead.campaignId) leadPreferences.leadCampaignId = lead.campaignId;
  if (lead.referralName) leadPreferences.leadReferralName = lead.referralName;
  if (lead.assignedAgentName) leadPreferences.leadAssignedAgentName = lead.assignedAgentName;
  if (lead.lastContactDate) leadPreferences.leadLastContactDate = lead.lastContactDate;
  if (lead.probabilityOfSale !== undefined) leadPreferences.leadProbabilityOfSale = lead.probabilityOfSale;
  if (lead.leadTemperature) leadPreferences.leadTemperature = lead.leadTemperature;
  if (lead.dateFlexibility) leadPreferences.leadDateFlexibility = lead.dateFlexibility;
  if (lead.preferredContactMethod) leadPreferences.leadPreferredContactMethod = lead.preferredContactMethod;
  if (lead.travelStartDate) leadPreferences.currentTripDate = lead.travelStartDate;
  if (leadServiceTypes.length > 0) leadPreferences.currentTripServices = leadServiceTypes;
  if (lead.preferences) leadPreferences.currentTripPreferences = lead.preferences;
  if (lead.notes) leadPreferences.currentTripNotes = lead.notes;

  const contacts = [...(input.contacts ?? [])];
  if (lead.email && !contacts.some((contact) => contact.type === 'email' && contact.value === lead.email)) {
    contacts.push({ type: 'email', value: lead.email });
  }
  if (lead.phone && !contacts.some((contact) => contact.value === lead.phone)) {
    contacts.push({ type: 'cell', value: lead.phone });
  }

  return {
    ...input,
    contacts,
    leadId: lead.id,
    travelPreferences: {
      ...leadPreferences,
      ...(input.travelPreferences ?? {})
    }
  };
}

export function mapLeadToClosedWon(current: Lead): Lead {
  return {
    ...current,
    status: 'closed_won',
    updatedAt: nowIsoDate()
  };
}
