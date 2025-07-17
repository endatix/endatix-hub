import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { TelemetryConfig } from "./telemetry-config";
import { TelemetryInitStrategy } from "./strategies/telemetry-init-strategy.interface";
import { AzureTelemetryStrategy, OtelTelemetryStrategy } from "./strategies";

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
    this.resource = new Resource({
      [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.SERVICE_NAME,
    });

    if (TelemetryConfig.isAzureConfigured()) {
      this.strategy = new AzureTelemetryStrategy();
    } else if (TelemetryConfig.isOtelConfigured()) {
      this.strategy = new OtelTelemetryStrategy();
    }
  }

  /**
   * Initialize and start the telemetry SDK
   */
  initialize(): void {
    if (!this.strategy?.initialize) {
      console.warn("No telemetry strategy configured");
      return;
    }

    try {
      this.sdk = this.strategy.initialize(this.resource);
      this.sdk.start();

      this.registerShutdownHandler();
      console.log(`Telemetry SDK started in ${this.strategy.name} mode`);
    } catch (error) {
      console.error("Failed to initialize telemetry:", error);
    }
  }

  /**
   * Register handlers for graceful shutdown
   */
  private registerShutdownHandler(): void {
    if (!this.sdk) return;

    const shutdownHandler = () => {
      if (this.sdk) {
        this.sdk
          .shutdown()
          .then(
            () => console.log("Telemetry SDK shut down successfully"),
            (err) => console.error("Error shutting down Telemetry SDK", err),
          )
          .finally(() => process.exit(0));
      }
    };

    // Register for various termination signals
    process.on("SIGTERM", shutdownHandler);
    process.on("SIGINT", shutdownHandler);
  }
}
