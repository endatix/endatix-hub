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
import { TelemetryInitStrategy } from "./telemetry-init-strategy.interface";
import { FilteringSpanProcessor } from "../filtering-span-processor";
import { JsonConsoleLogRecordExporter } from "../json-console-log-record-exporter";
import { TelemetryConfig, type OtlpProtocol } from "../telemetry-config";

const OTLP_SPAN_PROCESSOR_OPTIONS = {
  scheduledDelayMillis: 1000,
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
} as const;

/**
 * No url, headers or credentials are passed: each exporter reads
 * OTEL_EXPORTER_OTLP_[SIGNAL_]ENDPOINT, _HEADERS, _INSECURE, _CERTIFICATE and
 * _CLIENT_* itself, so endpoint, TLS and auth follow the OTel spec.
 */
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

/**
 * Which exporters this process uses, resolved once from env. An OTLP protocol is
 * present only when that signal has an endpoint.
 */
interface ExporterPlan {
  azureConnectionString?: string;
  otlpTracesProtocol?: OtlpProtocol;
  otlpLogsProtocol?: OtlpProtocol;
  jsonConsole: boolean;
}

function resolveExporterPlan(): ExporterPlan {
  return {
    azureConnectionString: TelemetryConfig.azureConnectionString(),
    otlpTracesProtocol: TelemetryConfig.isOtlpSignalConfigured("TRACES")
      ? TelemetryConfig.otlpProtocol("TRACES")
      : undefined,
    otlpLogsProtocol: TelemetryConfig.isOtlpSignalConfigured("LOGS")
      ? TelemetryConfig.otlpProtocol("LOGS")
      : undefined,
    jsonConsole: TelemetryConfig.isConsoleOutputForced(),
  };
}

function hasOtlp(plan: ExporterPlan): boolean {
  return !!plan.otlpTracesProtocol || !!plan.otlpLogsProtocol;
}

function describeExporterPlan(plan: ExporterPlan): string {
  const modes = [
    plan.azureConnectionString ? "Azure AppInsights" : undefined,
    hasOtlp(plan) ? "OTel" : undefined,
  ].filter(Boolean);
  return modes.length > 0 ? modes.join(" + ") : "none";
}

function buildSpanProcessors(plan: ExporterPlan): SpanProcessor[] {
  // The filter must run first: it marks noisy spans unsampled before any
  // exporting processor sees them.
  const processors: SpanProcessor[] = [new FilteringSpanProcessor()];

  if (plan.azureConnectionString) {
    processors.push(
      new BatchSpanProcessor(
        new AzureMonitorTraceExporter({
          connectionString: plan.azureConnectionString,
        }),
      ),
    );
  }

  if (plan.otlpTracesProtocol) {
    processors.push(
      new BatchSpanProcessor(
        OTLP_TRACE_EXPORTERS[plan.otlpTracesProtocol](),
        OTLP_SPAN_PROCESSOR_OPTIONS,
      ),
    );
  }

  return processors;
}

function buildLogRecordProcessors(plan: ExporterPlan): LogRecordProcessor[] {
  const processors: LogRecordProcessor[] = [];

  if (plan.jsonConsole) {
    processors.push(
      new SimpleLogRecordProcessor({
        exporter: new JsonConsoleLogRecordExporter(),
      }),
    );
  }

  if (plan.azureConnectionString) {
    processors.push(
      new BatchLogRecordProcessor({
        exporter: new AzureMonitorLogExporter({
          connectionString: plan.azureConnectionString,
        }),
      }),
    );
  }

  if (plan.otlpLogsProtocol) {
    processors.push(
      new BatchLogRecordProcessor({
        exporter: OTLP_LOG_EXPORTERS[plan.otlpLogsProtocol](),
      }),
    );
  }

  return processors;
}

/**
 * Settles every promise, then rejects with the first failure, so one failing
 * pipeline does not stop the others from flushing.
 */
async function settleAll(promises: Array<Promise<unknown>>): Promise<void> {
  const results = await Promise.allSettled(promises);
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) {
    throw failure.reason;
  }
}

/**
 * Single NodeSDK for every host. Azure Monitor and OTLP are exporters on the
 * same resource / logger provider so TelemetryLogger.emit() reaches App Insights,
 * a collector, and (when forced) stdout.
 */
export class NodeSdkTelemetryStrategy implements TelemetryInitStrategy {
  private plan: ExporterPlan | undefined;
  private sdk: NodeSDK | undefined;
  private loggerProvider: LoggerProvider | undefined;
  private spanProcessors: SpanProcessor[] = [];

  get name(): string {
    return describeExporterPlan(this.plan ?? resolveExporterPlan());
  }

  initialize(resource: Resource): NodeSDK {
    const plan = resolveExporterPlan();
    if (!plan.azureConnectionString && !hasOtlp(plan)) {
      throw new Error(
        "No telemetry exporter configured. Set APPLICATIONINSIGHTS_CONNECTION_STRING and/or OTEL_EXPORTER_OTLP_ENDPOINT.",
      );
    }

    // Build every exporter before registering anything global, so a constructor
    // that throws (e.g. a malformed connection string) leaves no half-wired state.
    const spanProcessors = buildSpanProcessors(plan);
    const loggerProvider = new LoggerProvider({
      resource,
      processors: buildLogRecordProcessors(plan),
    });

    const sdk = new NodeSDK({
      resource,
      // The initializer already ran resource detection; running it again here
      // would give spans attributes the logger provider never saw.
      autoDetectResources: false,
      spanProcessors,
      // Empty lists, not omitted: omitted, NodeSDK builds an OTLP metric reader and
      // a second logger provider from env (default http/protobuf to localhost:4318)
      // that Hub never asked for.
      metricReaders: [],
      logRecordProcessors: [],
      contextManager: new AsyncLocalStorageContextManager(),
      sampler: new AlwaysOnSampler(),
      // UndiciInstrumentation is what makes Hub -> API calls join one trace. Node 18+ global
      // fetch is undici, which bypasses node:http entirely, so HttpInstrumentation never sees
      // it. Next.js already creates fetch spans; we do not add FetchInstrumentation (that
      // package is for browsers, and @vercel/otel's fetch helper is Vercel-drain specific).
      instrumentations: [new HttpInstrumentation(), new UndiciInstrumentation()],
    });

    // Same split as @vercel/otel: traces via the tracer SDK, logs via an explicit
    // LoggerProvider registered before sdk.start(), on the same resource as spans.
    logs.setGlobalLoggerProvider(loggerProvider);

    this.plan = plan;
    this.sdk = sdk;
    this.loggerProvider = loggerProvider;
    this.spanProcessors = spanProcessors;

    console.log(
      `OpenTelemetry SDK configured (${this.name}; OTLP traces: ${plan.otlpTracesProtocol ?? "off"}, logs: ${plan.otlpLogsProtocol ?? "off"})`,
    );
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
