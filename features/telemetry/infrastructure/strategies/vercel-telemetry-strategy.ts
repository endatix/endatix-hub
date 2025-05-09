import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { registerOTel } from "@vercel/otel";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { TelemetryConfig } from "../telemetry-config";
import { diag } from '@opentelemetry/api';

/**
 * Aspire telemetry initialization strategy via @vercel/otel
 */
export class VercelTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Initialize telemetry for local development
   * @param resource OpenTelemetry resource
   * @returns The initialized SDK
   */
  initialize(resource: Resource): NodeSDK | undefined {
    // Initialize the OpenTelemetry SDK using the Vercel SDK
    // TODO: Implement with Node SDK as per this sample https://github.com/dotnet/aspire/discussions/5304.

    const spanProcessors = [new BatchSpanProcessor(new OTLPTraceExporter())];

    registerOTel({
      serviceName: resource.attributes[
        TelemetryConfig.ATTR_SERVICE_NAME
      ] as string,
      spanProcessors: spanProcessors
    });


    diag.info("@endatix: Otel has been initialized.");

    return undefined;
  }

  name: string = "OpenTelemetry";
}
