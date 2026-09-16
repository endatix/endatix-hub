import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { credentials } from "@grpc/grpc-js";
import { Resource } from "@opentelemetry/resources";
import { logs } from "@opentelemetry/api-logs";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { AlwaysOnSampler } from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  AzureMonitorLogExporter,
  AzureMonitorTraceExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { FilteringSpanProcessor } from "../filtering-span-processor";
import { TelemetryConfig } from "../telemetry-config";

const OTLP_SPAN_PROCESSOR_OPTIONS = {
  scheduledDelayMillis: 1000,
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
} as const;

/**
 * Single NodeSDK for every host. Azure Monitor and OTLP are exporters on the
 * same resource / logger provider so TelemetryLogger.emit() reaches App Insights
 * `traces`, a collector, and stdout.
 */
export class NodeSdkTelemetryStrategy implements TelemetryInitStrategy {
  private loggerProvider: LoggerProvider | undefined;

  initialize(resource: Resource): NodeSDK {
    const azureConnectionString =
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (!azureConnectionString && !otlpEndpoint) {
      throw new Error(
        "No telemetry exporter configured. Set APPLICATIONINSIGHTS_CONNECTION_STRING and/or OTEL_EXPORTER_OTLP_ENDPOINT.",
      );
    }

    const spanProcessors = [new FilteringSpanProcessor()];
    const logRecordProcessors = [
      new SimpleLogRecordProcessor({
        exporter: new ConsoleLogRecordExporter(),
      }),
    ];

    if (azureConnectionString) {
      spanProcessors.push(
        new BatchSpanProcessor(
          new AzureMonitorTraceExporter({
            connectionString: azureConnectionString,
          }),
        ),
      );
      logRecordProcessors.push(
        new BatchLogRecordProcessor({
          exporter: new AzureMonitorLogExporter({
            connectionString: azureConnectionString,
          }),
        }),
      );
    }

    if (otlpEndpoint) {
      console.log(`Initializing OpenTelemetry for endpoint: ${otlpEndpoint}`);
      const isHttps = otlpEndpoint.startsWith("https://");
      const exporterConfig = {
        credentials: !isHttps
          ? credentials.createInsecure()
          : credentials.createSsl(),
      };

      spanProcessors.push(
        new BatchSpanProcessor(
          new OTLPTraceExporter(exporterConfig),
          OTLP_SPAN_PROCESSOR_OPTIONS,
        ),
      );
      logRecordProcessors.push(
        new BatchLogRecordProcessor({
          exporter: new OTLPLogExporter(exporterConfig),
        }),
      );
    }

    // Same split as @vercel/otel: traces via the tracer SDK, logs via an explicit
    // LoggerProvider + logs.setGlobalLoggerProvider. NodeSDK logRecordProcessors
    // alone are easy to lose in a Next.js bundle (second api-logs copy = NoOp emit).
    this.loggerProvider = new LoggerProvider({
      resource,
      processors: logRecordProcessors,
    });
    logs.setGlobalLoggerProvider(this.loggerProvider);

    const sdk = new NodeSDK({
      resource,
      autoDetectResources: true,
      spanProcessors,
      contextManager: new AsyncLocalStorageContextManager(),
      sampler: new AlwaysOnSampler(),
      // UndiciInstrumentation is what makes Hub -> API calls join one trace. Node 18+ global
      // fetch is undici, which bypasses node:http entirely, so HttpInstrumentation never sees
      // it. Next.js already creates fetch spans; we do not add FetchInstrumentation (that
      // package is for browsers, and @vercel/otel's fetch helper is Vercel-drain specific).
      instrumentations: [
        new HttpInstrumentation({
          ignoreIncomingRequestHook: (req) =>
            (req.url ?? "").includes("telemetry.nextjs.org"),
        }),
        new UndiciInstrumentation(),
      ],
    });

    console.log(`OpenTelemetry SDK configured (${this.name})`);
    return sdk;
  }

  async shutdownLogs(): Promise<void> {
    await this.loggerProvider?.shutdown();
  }

  get name(): string {
    const azure = TelemetryConfig.isAzureConfigured();
    const otlp = TelemetryConfig.isOtelConfigured();
    if (azure && otlp) {
      return "Azure AppInsights + OTel";
    }
    if (azure) {
      return "Azure AppInsights";
    }
    return "OTel";
  }
}
