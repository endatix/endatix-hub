import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";

/**
 * Builds and owns the telemetry pipelines for one process.
 */
export interface TelemetryInitStrategy {
  /**
   * Build the exporters, register the global LoggerProvider and return the
   * NodeSDK. The caller starts it.
   * @param resource Resource shared by spans and logs
   */
  initialize(resource: Resource): NodeSDK;

  /**
   * Export everything buffered without stopping the pipelines, so records emitted
   * afterwards (e.g. while Next.js drains requests on SIGTERM) still export.
   */
  forceFlush(): Promise<void>;

  /**
   * Flush and stop every pipeline this strategy built: the NodeSDK and the
   * LoggerProvider the SDK does not own.
   */
  shutdown(): Promise<void>;

  /**
   * Human-readable exporter mode, e.g. "Azure AppInsights + OTel"
   */
  readonly name: string;
}
