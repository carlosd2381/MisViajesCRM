import { startApiServer } from './app';
import { bootstrapOpenTelemetryMetrics } from './core/observability/otel-metrics-bootstrap';

const port = Number(process.env.PORT ?? 3000);
const stopOtelMetrics = bootstrapOpenTelemetryMetrics();
const server = startApiServer(port);

server.on('close', stopOtelMetrics);
