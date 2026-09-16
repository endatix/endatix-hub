import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";

/**
 * Strategy interface for telemetry SDK initialization
 */
export interface TelemetryInitStrategy {
  /**
   * Initialize and start the telemetry SDK
   * @param resource The OpenTelemetry resource
   * @returns The initialized SDK (not started)
   */
  initialize(resource: Resource): NodeSDK;

  /**
   * Flush the Logs API provider. NodeSDK.shutdown() does not own a provider
   * we register ourselves (same split @vercel/otel uses).
   */
  shutdownLogs?(): Promise<void>;

  /**
   * Get the name of the telemetry strategy
   * @returns The name of the telemetry strategy
   */
  name: string;
}
