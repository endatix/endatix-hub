import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

function parseOtlpHeaders(headerString: string): Record<string, string> {
  return headerString
    .split(",")
    .map((pair) => pair.trim())
    .reduce((headers, pair) => {
      const [key, value] = pair.split("=");
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
      return headers;
    }, {} as Record<string, string>);
}

/**
 * Local development telemetry initialization strategy via OpenTelemetry
 */
export class OtelTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Initialize telemetry for local development
   * @param resource OpenTelemetry resource
   * @returns The initialized SDK
   */
  initialize(resource: Resource): NodeSDK | undefined {
    const otlpEndpoint = `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;
    const additionalHeaders = process.env.OTEL_EXPORTER_OTLP_HEADERS
      ? parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS)
      : {};
    const exporterHeaders = {
      "Content-Type": "application/x-protobuf",
      ...additionalHeaders,
    };
    const traceExporter = new OTLPTraceExporter({
      url: otlpEndpoint,
      headers: exporterHeaders,
    });

    console.log("OTLPTraceExporter initialized", resource);
    // Create the SDK
    const sdk = new NodeSDK({
      resource,
      // traceExporter,
      spanProcessors: [new BatchSpanProcessor(traceExporter)],
    });

    return sdk;
  }

  name: string = "OpenTelemetry";
}

