import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { TelemetryConfig } from "./telemetry-config";
import { TelemetryInitStrategy } from "./strategies/telemetry-init-strategy.interface";
import { NodeSdkTelemetryStrategy } from "./strategies";
import { TelemetryLogger } from "./telemetry-logger";

const DIAG_LEVELS: Record<string, DiagLogLevel> = {
  ALL: DiagLogLevel.ALL,
  VERBOSE: DiagLogLevel.VERBOSE,
  DEBUG: DiagLogLevel.DEBUG,
  INFO: DiagLogLevel.INFO,
  WARN: DiagLogLevel.WARN,
  ERROR: DiagLogLevel.ERROR,
  NONE: DiagLogLevel.NONE,
};

/**
 * Telemetry initializer responsible for setting up and starting telemetry
 */
export class TelemetryInitializer {
  private sdk: NodeSDK | null = null;
  private strategy: TelemetryInitStrategy | null = null;
  private resource: Resource;

  /**
   * Create a telemetry initializer with the appropriate strategy based on environment
   */
  constructor() {
    this.resource = resourceFromAttributes({
      [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.serviceName(),
      "deployment.environment.name": process.env.NODE_ENV,
      "process.runtime.name": "nodejs",
    });

    if (TelemetryConfig.isSdkDisabled()) {
      this.strategy = null;
    } else if (
      TelemetryConfig.isAzureConfigured() ||
      TelemetryConfig.isOtelConfigured()
    ) {
      this.strategy = new NodeSdkTelemetryStrategy();
    }
  }

  /**
   * Initialize and start the telemetry SDK
   */
  initialize(): void {
    applyOtelDiagLogLevel();

    if (TelemetryConfig.isSdkDisabled()) {
      console.log("OpenTelemetry SDK disabled (OTEL_SDK_DISABLED)");
      return;
    }

    if (!this.strategy?.initialize) {
      console.warn("No telemetry strategy configured");
      return;
    }

    try {
      this.sdk = this.strategy.initialize(this.resource);
      this.sdk.start();
      this.registerUnhandledErrorHandlers();
      this.registerShutdownHandler();
      console.log(`Telemetry SDK started in ${this.strategy.name} mode`);
    } catch (error) {
      console.error("Failed to initialize telemetry:", error);
    }
  }

  /**
   * Register handlers so uncaught exceptions and unhandled rejections are sent
   * as OTel logs (exception.* attributes).
   */
  private registerUnhandledErrorHandlers(): void {
    process.on("uncaughtException", (err: Error) => {
      TelemetryLogger.error("Uncaught exception", err, {}, "instrumentation");
      void this.shutdownTelemetry().finally(() => process.exit(1));
    });

    process.on("unhandledRejection", (reason: unknown) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      TelemetryLogger.error(
        "Unhandled promise rejection",
        error,
        {},
        "instrumentation",
      );
    });
  }

  /**
   * Register handlers for graceful shutdown
   */
  private registerShutdownHandler(): void {
    if (!this.sdk) return;

    const shutdownHandler = () => {
      void this.shutdownTelemetry()
        .then(
          () => console.log("Telemetry SDK shut down successfully"),
          (err) => console.error("Error shutting down Telemetry SDK", err),
        )
        .finally(() => process.exit(0));
    };

    process.on("SIGTERM", shutdownHandler);
    process.on("SIGINT", shutdownHandler);
  }

  private shutdownTelemetry(): Promise<unknown> {
    return Promise.all([
      this.sdk?.shutdown() ?? Promise.resolve(),
      this.strategy?.shutdownLogs?.() ?? Promise.resolve(),
    ]);
  }
}

function applyOtelDiagLogLevel(): void {
  const raw = process.env.OTEL_LOG_LEVEL?.trim().toUpperCase();
  if (!raw) {
    return;
  }

  const level = DIAG_LEVELS[raw];
  if (level === undefined) {
    return;
  }

  diag.setLogger(new DiagConsoleLogger(), level);
}
