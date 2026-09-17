import { TelemetryInitializer } from "./features/telemetry/infrastructure/telemetry-initializer";

/**
 * Node.js telemetry entry point, imported by instrumentation.ts register().
 * One NodeSDK with Azure Monitor and/or OTLP exporters — see TelemetrySdk.
 */
new TelemetryInitializer().initialize();
