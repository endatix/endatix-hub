import { Resource } from "@opentelemetry/resources";
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { FilteringSpanProcessor } from "../filtering-span-processor";

/**
 * Azure Application Insights telemetry strategy using the official distro.
 * Uses useAzureMonitor() for automatic traces, metrics, logs, and exception collection.
 * Registers a FilteringSpanProcessor to exclude noisy spans (Next.js static assets,
 * RSC payloads, health checks, duplicate internal metric spans). See:
 * https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-filter?tabs=nodejs
 *
 * Returns null because the distro manages SDK lifecycle and shutdown internally.
 */
export class AzureTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Initialize telemetry via the Azure Monitor OpenTelemetry distro
   * @param resource OpenTelemetry resource (service name etc.)
   * @returns null – distro manages lifecycle
   */
  initialize(resource: Resource): null {
    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "APPLICATIONINSIGHTS_CONNECTION_STRING is not configured",
      );
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAzureMonitor({
      azureMonitorExporterOptions: { connectionString },
      resource,
      spanProcessors: [new FilteringSpanProcessor()],
    });

    return null;
  }

  name: string = "Azure AppInsights";
}
