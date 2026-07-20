export { TelemetryConfig } from "./infrastructure/telemetry-config";
export { TelemetryTracer } from "./infrastructure/telemetry-tracer";
export {
  TelemetryLogger,
  LogSeverity,
  parseErrorMessage,
  type LogAttributes,
} from "./infrastructure/telemetry-logger";

// TelemetryInitializer is Node-only (OTEL/gRPC). Import it from
// `./infrastructure/telemetry-initializer` (as instrumentation.node.ts does),
// not from this barrel — otherwise client bundles pull in `net`/`fs`.
