import { TelemetryInitializer } from "./features/telemetry/infrastructure/telemetry-initializer";

/**
 * Node.js telemetry entry point, imported by instrumentation.ts register().
 * One NodeSDK plus an explicit LoggerProvider — see TelemetrySdk.
 */
new TelemetryInitializer().initialize();
