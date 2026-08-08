import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { credentials } from "@grpc/grpc-js";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { Resource } from "@opentelemetry/resources";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { AlwaysOnSampler } from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

/**
 * Local development telemetry initialization strategy via OpenTelemetry.
 * Builds and returns a NodeSDK; TelemetryInitializer is responsible for
 * calling sdk.start(), registering unhandled error handlers, and shutdown.
 */
export class OtelTelemetryStrategy implements TelemetryInitStrategy {
  /**
   * Build and return the OpenTelemetry NodeSDK for local/OTLP.
   * The initializer will start the SDK and register lifecycle handlers.
   * @param resource OpenTelemetry resource
   * @returns The configured SDK (not started)
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

    const logProcessor = new BatchLogRecordProcessor({
      exporter: logExporter,
    });

    const sdk = new NodeSDK({
      resource,
      autoDetectResources: true,
      spanProcessors: [spanProcessor],
      logRecordProcessors: [logProcessor],
      contextManager: new AsyncLocalStorageContextManager(),
      sampler: new AlwaysOnSampler(),
      // UndiciInstrumentation is what makes Hub -> API calls join one trace. Node 18+ global
      // fetch is undici, which bypasses node:http entirely, so HttpInstrumentation never sees
      // it; FetchInstrumentation is the *browser* instrumentation and does nothing here. Next.js
      // still traced these calls through its own fetch instrumentation, which produces a client
      // span but injects no traceparent header -- so the API started a fresh trace on every
      // request and no trace ever spanned both services.
      instrumentations: [
        new HttpInstrumentation(),
        new UndiciInstrumentation(),
        new FetchInstrumentation(),
      ],
    });

    console.log("OpenTelemetry SDK configured successfully");

    return sdk;
  }

  name: string = "OTel";
}
