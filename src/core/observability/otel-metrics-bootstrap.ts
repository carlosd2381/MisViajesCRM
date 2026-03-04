import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ConsoleMetricExporter, MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

interface OpenTelemetryBootstrapConfig {
  enabled: boolean;
  exporter: 'otlp' | 'console';
  meterName: string;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  exportIntervalMs: number;
  otlpEndpoint?: string;
  otlpHeaders?: Record<string, string>;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseHeaders(raw: string | undefined): Record<string, string> | undefined {
  if (!raw?.trim()) return undefined;

  const entries = raw.split(',');
  const headers: Record<string, string> = {};

  for (const entry of entries) {
    const [key, value] = entry.split('=');
    if (!key || !value) continue;
    headers[key.trim()] = value.trim();
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

function exporterKind(value: string | undefined): 'otlp' | 'console' {
  return value === 'otlp' ? 'otlp' : 'console';
}

function loadConfig(): OpenTelemetryBootstrapConfig {
  return {
    enabled: parseBoolean(process.env.AUTH_OTEL_SDK_ENABLED, false),
    exporter: exporterKind(process.env.AUTH_OTEL_EXPORTER),
    meterName: process.env.AUTH_OTEL_METER_NAME ?? 'misviajescrm.auth',
    serviceName: process.env.AUTH_OTEL_SERVICE_NAME ?? 'misviajescrm-api',
    serviceVersion: process.env.AUTH_OTEL_SERVICE_VERSION ?? '0.1.0',
    environment: process.env.AUTH_OTEL_ENVIRONMENT ?? 'development',
    exportIntervalMs: parsePositiveInt(process.env.AUTH_OTEL_EXPORT_INTERVAL_MS, 10000),
    otlpEndpoint: process.env.AUTH_OTEL_OTLP_ENDPOINT,
    otlpHeaders: parseHeaders(process.env.AUTH_OTEL_OTLP_HEADERS)
  };
}

function buildExporter(config: OpenTelemetryBootstrapConfig) {
  if (config.exporter === 'otlp') {
    return new OTLPMetricExporter({
      url: config.otlpEndpoint,
      headers: config.otlpHeaders
    });
  }

  return new ConsoleMetricExporter();
}

function safeShutdown(shutdown: () => Promise<void>): () => void {
  return () => {
    void shutdown().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`OTel metrics shutdown warning: ${message}`);
    });
  };
}

export function bootstrapOpenTelemetryMetrics(): () => void {
  const config = loadConfig();
  if (!config.enabled) return () => {};

  const resource = resourceFromAttributes({
    'service.name': config.serviceName,
    'service.version': config.serviceVersion,
    'deployment.environment': config.environment
  });

  const exporter = buildExporter(config);
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: config.exportIntervalMs
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [reader]
  });

  metrics.setGlobalMeterProvider(meterProvider);
  return safeShutdown(async () => {
    await meterProvider.shutdown();
  });
}
