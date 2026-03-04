import { metrics } from '@opentelemetry/api';
import type { RefreshTokenMetricsSink } from './refresh-token-metrics';

export interface OpenTelemetrySinkOptions {
  meterName?: string;
}

export class OpenTelemetryRefreshTokenMetricsSink implements RefreshTokenMetricsSink {
  private readonly counter;

  constructor(options: OpenTelemetrySinkOptions = {}) {
    const meterName = options.meterName ?? 'misviajescrm.auth';
    const meter = metrics.getMeter(meterName);

    this.counter = meter.createCounter('misviajescrm_auth_refresh_operations_total', {
      description: 'Auth refresh/session operations by outcome'
    });
  }

  onRecord(event: {
    operation: string;
    outcome: string;
    amount: number;
  }): void {
    this.counter.add(event.amount, {
      operation: event.operation,
      outcome: event.outcome
    });
  }
}
