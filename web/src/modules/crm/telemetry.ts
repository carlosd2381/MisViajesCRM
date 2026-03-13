export type LeadConvertTelemetryPhase = 'start' | 'invalid' | 'abort' | 'fail' | 'success';

export interface LeadConvertTelemetryEvent {
  phase: LeadConvertTelemetryPhase;
  leadId?: string;
  clientId?: string;
  statusCode?: number;
  durationMs?: number;
  reason?: string;
}

export interface LeadConvertTelemetryDetail extends LeadConvertTelemetryEvent {
  timestamp: string;
}

export const LEAD_CONVERT_EVENT_NAME = 'misviajescrm:lead-convert';

export function trackLeadConvertTelemetry(event: LeadConvertTelemetryEvent): void {
  const detail: LeadConvertTelemetryDetail = {
    ...event,
    timestamp: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEAD_CONVERT_EVENT_NAME, { detail }));
  }

  if (import.meta.env.DEV) {
    console.debug('[crm][lead-convert]', detail);
  }
}
