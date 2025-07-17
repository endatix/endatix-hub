import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { credentials } from "@grpc/grpc-js";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { Resource } from "@opentelemetry/resources";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { AlwaysOnSampler } from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

/**
 * Local development telemetry initialization strategy via OpenTelemetry
 */
export class OtelTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Initialize telemetry for local development
   * @param resource OpenTelemetry resource
   * @returns The initialized SDK
   */
  initialize(resource: Resource): NodeSDK {
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (!otlpEndpoint) {
      throw new Error("OTEL_EXPORTER_OTLP_ENDPOINT is not configured");
    }

    console.log(`Initializing OpenTelemetry for endpoint: ${otlpEndpoint}`);
    const isHttps = otlpEndpoint.startsWith("https://");
    const exporterConfig = {
      credentials: !isHttps
        ? credentials.createInsecure()
        : credentials.createSsl(),
    };

    // Create exporters
    const traceExporter = new OTLPTraceExporter(exporterConfig);
    const logExporter = new OTLPLogExporter(exporterConfig);

    // Create processors and readers
    const spanProcessor = new BatchSpanProcessor(traceExporter, {
      scheduledDelayMillis: 1000,
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
    });

    const logProcessor = new BatchLogRecordProcessor(logExporter);

    const sdk = new NodeSDK({
      resource,
      autoDetectResources: true,
      spanProcessors: [spanProcessor],
      logRecordProcessors: [logProcessor],
      traceExporter: traceExporter,
      contextManager: new AsyncLocalStorageContextManager(),
      sampler: new AlwaysOnSampler(),
      instrumentations: [new HttpInstrumentation(), new FetchInstrumentation()],
    });

    console.log("OpenTelemetry SDK configured successfully");

    return sdk;
  }

  name: string = "OTel";
}
