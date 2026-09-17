import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPProtoTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPTraceExporter as OTLPJsonTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter as OTLPGrpcLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as OTLPProtoLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPLogExporter as OTLPJsonLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { logs } from "@opentelemetry/api-logs";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  SimpleLogRecordProcessor,
  type LogRecordExporter,
  type LogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import {
  AlwaysOnSampler,
  type SpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  AzureMonitorLogExporter,
  AzureMonitorTraceExporter,
} from "@azure/monitor-opentelemetry-exporter";
import { FilteringSpanProcessor } from "./filtering-span-processor";
import { JsonConsoleLogRecordExporter } from "./json-console-log-record-exporter";
import { TelemetryConfig, type OtlpProtocol } from "./telemetry-config";

const OTLP_SPAN_PROCESSOR_OPTIONS = {
  scheduledDelayMillis: 1000,
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
} as const;

/** Exporters read OTEL_EXPORTER_OTLP_* themselves (endpoint, headers, TLS). */
const OTLP_TRACE_EXPORTERS: Record<OtlpProtocol, () => SpanExporter> = {
  grpc: () => new OTLPGrpcTraceExporter(),
  "http/protobuf": () => new OTLPProtoTraceExporter(),
  "http/json": () => new OTLPJsonTraceExporter(),
};

const OTLP_LOG_EXPORTERS: Record<OtlpProtocol, () => LogRecordExporter> = {
  grpc: () => new OTLPGrpcLogExporter(),
  "http/protobuf": () => new OTLPProtoLogExporter(),
  "http/json": () => new OTLPJsonLogExporter(),
};

type Exporters = {
  azureConnectionString?: string;
  otlpTracesProtocol?: OtlpProtocol;
  otlpLogsProtocol?: OtlpProtocol;
  jsonConsole: boolean;
};

function resolveExporters(): Exporters {
  return {
    azureConnectionString: TelemetryConfig.azureConnectionString(),
    otlpTracesProtocol: TelemetryConfig.isOtlpSignalConfigured("TRACES")
      ? TelemetryConfig.otlpProtocol("TRACES")
      : undefined,
    otlpLogsProtocol: TelemetryConfig.isOtlpSignalConfigured("LOGS")
      ? TelemetryConfig.otlpProtocol("LOGS")
      : undefined,
    jsonConsole: TelemetryConfig.consoleFallbackEnabled(),
  };
}

function modeName(exporters: Exporters): string {
  const parts = [
    exporters.azureConnectionString ? "Azure AppInsights" : undefined,
    exporters.otlpTracesProtocol || exporters.otlpLogsProtocol
      ? "OTel"
      : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : "none";
}

function spanProcessorsFor(exporters: Exporters): SpanProcessor[] {
  const processors: SpanProcessor[] = [new FilteringSpanProcessor()];
  if (exporters.azureConnectionString) {
    processors.push(
      new BatchSpanProcessor(
        new AzureMonitorTraceExporter({
          connectionString: exporters.azureConnectionString,
        }),
      ),
    );
  }
  if (exporters.otlpTracesProtocol) {
    processors.push(
      new BatchSpanProcessor(
        OTLP_TRACE_EXPORTERS[exporters.otlpTracesProtocol](),
        OTLP_SPAN_PROCESSOR_OPTIONS,
      ),
    );
  }
  return processors;
}

function logProcessorsFor(exporters: Exporters): LogRecordProcessor[] {
  const processors: LogRecordProcessor[] = [];
  if (exporters.jsonConsole) {
    processors.push(
      new SimpleLogRecordProcessor({
        exporter: new JsonConsoleLogRecordExporter(),
      }),
    );
  }
  if (exporters.azureConnectionString) {
    processors.push(
      new BatchLogRecordProcessor({
        exporter: new AzureMonitorLogExporter({
          connectionString: exporters.azureConnectionString,
        }),
      }),
    );
  }
  if (exporters.otlpLogsProtocol) {
    processors.push(
      new BatchLogRecordProcessor({
        exporter: OTLP_LOG_EXPORTERS[exporters.otlpLogsProtocol](),
      }),
    );
  }
  return processors;
}

async function settleAll(promises: Array<Promise<unknown>>): Promise<void> {
  const failure = (await Promise.allSettled(promises)).find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) {
    throw failure.reason;
  }
}

/**
 * One NodeSDK + explicit LoggerProvider. Azure and OTLP are exporters on the
 * same resource so TelemetryLogger.emit() reaches App Insights and/or a collector.
 */
export class TelemetrySdk {
  name = "none";
  private sdk: NodeSDK | undefined;
  private loggerProvider: LoggerProvider | undefined;
  private spanProcessors: SpanProcessor[] = [];

  initialize(resource: Resource): NodeSDK {
    const exporters = resolveExporters();
    if (
      !exporters.azureConnectionString &&
      !exporters.otlpTracesProtocol &&
      !exporters.otlpLogsProtocol
    ) {
      throw new Error(
        "No telemetry exporter configured. Set APPLICATIONINSIGHTS_CONNECTION_STRING and/or OTEL_EXPORTER_OTLP_ENDPOINT.",
      );
    }

    const spanProcessors = spanProcessorsFor(exporters);
    const loggerProvider = new LoggerProvider({
      resource,
      processors: logProcessorsFor(exporters),
    });

    const sdk = new NodeSDK({
      resource,
      autoDetectResources: false,
      spanProcessors,
      metricReaders: [],
      logRecordProcessors: [],
      contextManager: new AsyncLocalStorageContextManager(),
      sampler: new AlwaysOnSampler(),
      instrumentations: [
        new HttpInstrumentation(),
        new UndiciInstrumentation(),
      ],
    });

    logs.setGlobalLoggerProvider(loggerProvider);

    this.name = modeName(exporters);
    this.sdk = sdk;
    this.loggerProvider = loggerProvider;
    this.spanProcessors = spanProcessors;
    return sdk;
  }

  forceFlush(): Promise<void> {
    return settleAll([
      ...this.spanProcessors.map((processor) => processor.forceFlush()),
      this.loggerProvider?.forceFlush() ?? Promise.resolve(),
    ]);
  }

  shutdown(): Promise<void> {
    return settleAll([
      this.sdk?.shutdown() ?? Promise.resolve(),
      this.loggerProvider?.shutdown() ?? Promise.resolve(),
    ]);
  }
}
