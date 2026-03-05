export type AiOperation = 'proposal' | 'render_web' | 'render_pdf' | 'schema' | 'render_schema';

interface AiOperationAccumulator {
  count: number;
  errorCount: number;
  blockedCount: number;
  totalDurationMs: number;
  lastStatusCode: number;
  totalEstimatedTokens: number;
  totalEstimatedCostUsd: number;
}

export interface AiObservabilitySnapshot {
  provider: string;
  totals: {
    requests: number;
    errors: number;
    blockedByQualityGate: number;
    avgDurationMs: number;
    totalEstimatedTokens: number;
    totalEstimatedCostUsd: number;
  };
  byOperation: Record<AiOperation, {
    count: number;
    errors: number;
    blockedByQualityGate: number;
    avgDurationMs: number;
    totalEstimatedTokens: number;
    totalEstimatedCostUsd: number;
    lastStatusCode: number;
  }>;
}

export interface AiRecordInput {
  operation: AiOperation;
  statusCode: number;
  durationMs: number;
  estimatedTokens?: number;
  estimatedCostUsd?: number;
  provider?: string;
}

function emptyOperation(): AiOperationAccumulator {
  return {
    count: 0,
    errorCount: 0,
    blockedCount: 0,
    totalDurationMs: 0,
    lastStatusCode: 0,
    totalEstimatedTokens: 0,
    totalEstimatedCostUsd: 0
  };
}

export class AiObservability {
  private provider = 'mock';
  private totals = emptyOperation();
  private operations: Record<AiOperation, AiOperationAccumulator> = {
    proposal: emptyOperation(),
    render_web: emptyOperation(),
    render_pdf: emptyOperation(),
    schema: emptyOperation(),
    render_schema: emptyOperation()
  };

  record(input: AiRecordInput): void {
    const estimatedTokens = Math.max(0, Math.round(input.estimatedTokens ?? 0));
    const estimatedCostUsd = Math.max(0, input.estimatedCostUsd ?? 0);
    const isError = input.statusCode >= 400;
    const isBlocked = input.statusCode === 422;

    this.provider = input.provider ?? this.provider;

    this.totals.count += 1;
    this.totals.totalDurationMs += Math.max(0, input.durationMs);
    this.totals.lastStatusCode = input.statusCode;
    this.totals.totalEstimatedTokens += estimatedTokens;
    this.totals.totalEstimatedCostUsd += estimatedCostUsd;
    if (isError) this.totals.errorCount += 1;
    if (isBlocked) this.totals.blockedCount += 1;

    const operationMetrics = this.operations[input.operation];
    operationMetrics.count += 1;
    operationMetrics.totalDurationMs += Math.max(0, input.durationMs);
    operationMetrics.lastStatusCode = input.statusCode;
    operationMetrics.totalEstimatedTokens += estimatedTokens;
    operationMetrics.totalEstimatedCostUsd += estimatedCostUsd;
    if (isError) operationMetrics.errorCount += 1;
    if (isBlocked) operationMetrics.blockedCount += 1;
  }

  snapshot(): AiObservabilitySnapshot {
    const mapOperation = (metrics: AiOperationAccumulator) => ({
      count: metrics.count,
      errors: metrics.errorCount,
      blockedByQualityGate: metrics.blockedCount,
      avgDurationMs: average(metrics.totalDurationMs, metrics.count),
      totalEstimatedTokens: metrics.totalEstimatedTokens,
      totalEstimatedCostUsd: roundUsd(metrics.totalEstimatedCostUsd),
      lastStatusCode: metrics.lastStatusCode
    });

    return {
      provider: this.provider,
      totals: {
        requests: this.totals.count,
        errors: this.totals.errorCount,
        blockedByQualityGate: this.totals.blockedCount,
        avgDurationMs: average(this.totals.totalDurationMs, this.totals.count),
        totalEstimatedTokens: this.totals.totalEstimatedTokens,
        totalEstimatedCostUsd: roundUsd(this.totals.totalEstimatedCostUsd)
      },
      byOperation: {
        proposal: mapOperation(this.operations.proposal),
        render_web: mapOperation(this.operations.render_web),
        render_pdf: mapOperation(this.operations.render_pdf),
        schema: mapOperation(this.operations.schema),
        render_schema: mapOperation(this.operations.render_schema)
      }
    };
  }

  reset(): void {
    this.provider = 'mock';
    this.totals = emptyOperation();
    this.operations = {
      proposal: emptyOperation(),
      render_web: emptyOperation(),
      render_pdf: emptyOperation(),
      schema: emptyOperation(),
      render_schema: emptyOperation()
    };
  }
}

function average(total: number, count: number): number {
  if (count <= 0) return 0;
  return Math.round((total / count) * 100) / 100;
}

function roundUsd(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

export const aiProposalObservability = new AiObservability();
