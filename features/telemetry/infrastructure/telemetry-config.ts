import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

/**
 * Telemetry configuration constants
 */
export const TelemetryConfig = {
  /**
   * Service name for telemetry
   */
  SERVICE_NAME: "endatix-hub",

  /**
   * Resource attribute key for service name
   */
  ATTR_SERVICE_NAME,

  /**
   * Determine if Azure Application Insights is configured
   */
  isAzureConfigured(): boolean {
    return !!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  },

  /**
   * Determine if OpenTelemetry is configured
   */
  isOtelConfigured(): boolean {
    return !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  },
};
