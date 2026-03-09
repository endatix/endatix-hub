import { Resource } from "@opentelemetry/resources";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";

/**
 * Azure Application Insights telemetry strategy using the official distro.
 * Uses useAzureMonitor() for automatic traces, metrics, logs, and exception collection.
 * Returns null because the distro manages SDK lifecycle and shutdown internally.
 */
export class AzureTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Initialize telemetry via the Azure Monitor OpenTelemetry distro
   * @param resource OpenTelemetry resource (service name etc.)
   * @returns null – distro manages lifecycle
   */
  initialize(resource: Resource): null {
    const connectionString =
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "APPLICATIONINSIGHTS_CONNECTION_STRING is not configured",
      );
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAzureMonitor({
      azureMonitorExporterOptions: { connectionString },
      resource,
    });

    return null;
  }

  name: string = "Azure AppInsights";
}
