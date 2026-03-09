import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";

/**
 * Strategy interface for telemetry SDK initialization
 */
export interface TelemetryInitStrategy {
  /**
   * Initialize and start the telemetry SDK
   * @param resource The OpenTelemetry resource
   * @returns The initialized SDK, or null when the strategy manages lifecycle itself (e.g. Azure distro)
   */
  initialize(resource: Resource): NodeSDK | null;

  /**
   * Get the name of the telemetry strategy
   * @returns The name of the telemetry strategy
   */
  name: string;
}
