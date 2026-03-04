export type RefreshOperation = 'issue' | 'rotate' | 'revoke' | 'revokeAllForUser' | 'pruneExpired';
export type RefreshOutcome = 'success' | 'failure';

export interface RefreshTokenMetricsSnapshot {
  counters: Record<string, number>;
  updatedAt: string;
}

export interface RefreshTokenMetricsOptions {
  logEnabled?: boolean;
  sinks?: RefreshTokenMetricsSink[];
}

export interface RefreshTokenMetricsSink {
  onRecord(event: {
    operation: RefreshOperation;
    outcome: RefreshOutcome;
    amount: number;
    total: number;
    at: string;
  }): void;
}

function toPromLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function toPromName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[.\-\s]+/g, '_')
    .toLowerCase();
}

function counterKey(operation: RefreshOperation, outcome: RefreshOutcome): string {
  return `${operation}.${outcome}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class RefreshTokenMetrics {
  private readonly logEnabled: boolean;
  private readonly sinks: RefreshTokenMetricsSink[];
  private readonly counters = new Map<string, number>();
  private updatedAt = nowIso();

  constructor(options: RefreshTokenMetricsOptions = {}) {
    this.logEnabled = options.logEnabled ?? false;
    this.sinks = options.sinks ?? [];
  }

  record(operation: RefreshOperation, outcome: RefreshOutcome, amount = 1): void {
    const key = counterKey(operation, outcome);
    const current = this.counters.get(key) ?? 0;
    const next = current + amount;

    this.counters.set(key, next);
    this.updatedAt = nowIso();

    if (this.logEnabled) {
      console.log(
        JSON.stringify({
          event: 'auth.refresh.metrics',
          operation,
          outcome,
          amount,
          total: next,
          at: this.updatedAt
        })
      );
    }

    for (const sink of this.sinks) {
      sink.onRecord({ operation, outcome, amount, total: next, at: this.updatedAt });
    }
  }

  snapshot(): RefreshTokenMetricsSnapshot {
    const counters: Record<string, number> = {};

    for (const [key, value] of this.counters.entries()) {
      counters[key] = value;
    }

    return {
      counters,
      updatedAt: this.updatedAt
    };
  }

  toPrometheus(): string {
    const lines = [
      '# HELP misviajescrm_auth_refresh_counter Auth refresh/session operation counters',
      '# TYPE misviajescrm_auth_refresh_counter counter'
    ];

    for (const [key, value] of this.counters.entries()) {
      const [operationRaw, outcomeRaw] = key.split('.');
      const operation = toPromLabelValue(toPromName(operationRaw ?? 'unknown'));
      const outcome = toPromLabelValue(toPromName(outcomeRaw ?? 'unknown'));
      lines.push(`misviajescrm_auth_refresh_counter{operation="${operation}",outcome="${outcome}"} ${value}`);
    }

    lines.push('# HELP misviajescrm_auth_refresh_updated_at_seconds Last metrics update as unix epoch seconds');
    lines.push('# TYPE misviajescrm_auth_refresh_updated_at_seconds gauge');
    lines.push(`misviajescrm_auth_refresh_updated_at_seconds ${Math.floor(new Date(this.updatedAt).getTime() / 1000)}`);

    return `${lines.join('\n')}\n`;
  }
}
