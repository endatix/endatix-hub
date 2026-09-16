import { TelemetryInitializer } from './features/telemetry/infrastructure/telemetry-initializer';

/**
 * Initialize OpenTelemetry for Node.js (Next.js instrumentation.ts register()).
 * One NodeSDK plus an explicit LoggerProvider — see NodeSdkTelemetryStrategy.
 */

// Create and start the telemetry initializer
const telemetryInitializer = new TelemetryInitializer();
telemetryInitializer.initialize(); 