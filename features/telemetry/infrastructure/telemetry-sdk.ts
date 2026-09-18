import type { IncomingMessage, RequestOptions } from "node:http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPProtoTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPTraceExporter as OTLPJsonTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter as OTLPGrpcLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as OTLPProtoLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPLogExporter as OTLPJsonLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { createInsecureCredentials } from "@opentelemetry/otlp-grpc-exporter-base";
import { Resource } from "@opentelemetry/resources";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import {
  BatchLogRecordProcessor,
  SimpleLogRecordProcessor,
  type LogRecordExporter,
  type LogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import {
  AlwaysOnSampler,
  ParentBasedSampler,
  type Sampler,
  type SpanExporter,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  AzureMonitorLogExporter,
  AzureMonitorTraceExporter,
  RateLimitedSampler,
} from "@azure/monitor-opentelemetry-exporter";
import { FilteringSpanProcessor } from "./filtering-span-processor";
import { JsonConsoleLogRecordExporter } from "./json-console-log-record-exporter";
import {
  TelemetryConfig,
  type OtlpProtocol,
  type OtlpSignal,
} from "./telemetry-config";
import { isNextTelemetryHost, isNoisyRequestTarget } from "./telemetry-noise";

const OTLP_SPAN_PROCESSOR_OPTIONS = {
  scheduledDelayMillis: 1000,
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
} as const;

type Destination = "Azure AppInsights" | "OTel";

/** Exporters that were actually built, and the processors wrapping them. */
interface Pipelines {
  spanProcessors: SpanProcessor[];
  logProcessors: LogRecordProcessor[];
  destinations: Set<Destination>;
  exportsLogs: boolean;
}

/**
 * Builds one exporter. A destination whose exporter throws (e.g. a malformed
 * connection string) is logged and skipped, so the other destinations still start.
 */
function tryCreateExporter<T>(label: string, create: () => T): T | undefined {
  try {
    return create();
  } catch (error) {
    console.error(`Failed to create ${label} exporter; skipping it:`, error);
    return undefined;
  }
}

/**
 * gRPC exporters read endpoint, headers and TLS files from env themselves; only
 * the plaintext decision is Hub's (see TelemetryConfig.otlpGrpcPlaintext). HTTP
 * exporters read everything from env.
 */
function grpcOptions(signal: OtlpSignal) {
  return TelemetryConfig.otlpGrpcPlaintext(signal)
    ? { credentials: createInsecureCredentials() }
    : {};
}

const OTLP_TRACE_EXPORTERS: Record<OtlpProtocol, () => SpanExporter> = {
  grpc: () => new OTLPGrpcTraceExporter(grpcOptions("TRACES")),
  "http/protobuf": () => new OTLPProtoTraceExporter(),
  "http/json": () => new OTLPJsonTraceExporter(),
};

const OTLP_LOG_EXPORTERS: Record<OtlpProtocol, () => LogRecordExporter> = {
  grpc: () => new OTLPGrpcLogExporter(grpcOptions("LOGS")),
  "http/protobuf": () => new OTLPProtoLogExporter(),
  "http/json": () => new OTLPJsonLogExporter(),
};

function buildPipelines(): Pipelines {
  const azureConnectionString = TelemetryConfig.azureConnectionString();
  const pipelines: Pipelines = {
    // The filter must run first: it drops noisy traces and redacts URLs before
    // any exporting processor reads the span.
    spanProcessors: [new FilteringSpanProcessor()],
    logProcessors: [],
    destinations: new Set(),
    exportsLogs: false,
  };

  if (TelemetryConfig.consoleFallbackEnabled()) {
    pipelines.logProcessors.push(
      new SimpleLogRecordProcessor({
        exporter: new JsonConsoleLogRecordExporter(),
      }),
    );
  }

  if (azureConnectionString) {
    const traceExporter = tryCreateExporter(
      "Azure Monitor trace",
      () =>
        new AzureMonitorTraceExporter({
          connectionString: azureConnectionString,
        }),
    );
    if (traceExporter) {
      pipelines.spanProcessors.push(new BatchSpanProcessor(traceExporter));
      pipelines.destinations.add("Azure AppInsights");
    }

    const logExporter = tryCreateExporter(
      "Azure Monitor log",
      () =>
        new AzureMonitorLogExporter({
          connectionString: azureConnectionString,
        }),
    );
    if (logExporter) {
      pipelines.logProcessors.push(
        new BatchLogRecordProcessor({ exporter: logExporter }),
      );
      pipelines.destinations.add("Azure AppInsights");
      pipelines.exportsLogs = true;
    }
  }

  if (TelemetryConfig.isOtlpSignalConfigured("TRACES")) {
    const protocol = TelemetryConfig.otlpProtocol("TRACES");
    const exporter = tryCreateExporter(
      `OTLP ${protocol} trace`,
      OTLP_TRACE_EXPORTERS[protocol],
    );
    if (exporter) {
      pipelines.spanProcessors.push(
        new BatchSpanProcessor(exporter, OTLP_SPAN_PROCESSOR_OPTIONS),
      );
      pipelines.destinations.add("OTel");
    }
  }

  if (TelemetryConfig.isOtlpSignalConfigured("LOGS")) {
    const protocol = TelemetryConfig.otlpProtocol("LOGS");
    const exporter = tryCreateExporter(
      `OTLP ${protocol} log`,
      OTLP_LOG_EXPORTERS[protocol],
    );
    if (exporter) {
      pipelines.logProcessors.push(new BatchLogRecordProcessor({ exporter }));
      pipelines.destinations.add("OTel");
      pipelines.exportsLogs = true;
    }
  }

  return pipelines;
}

/**
 * Azure Monitor's own RateLimitedSampler when a rate applies: it follows a local
 * parent's decision and stamps `microsoft.sample_rate`, which App Insights needs
 * to extrapolate request and dependency counts. With `OTEL_TRACES_SAMPLER` set,
 * undefined lets NodeSDK build that sampler. Otherwise every trace is kept.
 */
function buildSampler(): Sampler | undefined {
  const tracesPerSecond = TelemetryConfig.tracesPerSecond();
  if (tracesPerSecond !== undefined) {
    return new RateLimitedSampler(tracesPerSecond);
  }
  if (TelemetryConfig.envSamplerConfigured()) {
    return undefined;
  }
  return new ParentBasedSampler({ root: new AlwaysOnSampler() });
}

function outgoingHost(options: RequestOptions): string | undefined {
  // `host` may carry a port (`telemetry.nextjs.org:443`); `hostname` never does.
  return options.hostname ?? options.host?.split(":")[0] ?? undefined;
}

function undiciHost(origin: string): string | undefined {
  try {
    return new URL(origin).hostname;
  } catch {
    return undefined;
  }
}

function buildInstrumentations() {
  return [
    new HttpInstrumentation({
      // Outgoing node:http calls (storage SDKs) become dependencies. In a Next.js
      // server `http` is loaded before instrumentation registers, so incoming
      // requests are traced by Next.js itself and noise is dropped per trace in
      // FilteringSpanProcessor; this hook covers servers where the patch applies.
      ignoreIncomingRequestHook: (request: IncomingMessage) =>
        isNoisyRequestTarget(request.url ?? ""),
      ignoreOutgoingRequestHook: (options: RequestOptions) =>
        isNextTelemetryHost(outgoingHost(options)),
    }),
    // Node's fetch is undici, which node:http instrumentation never sees. This is
    // what injects `traceparent` into Hub -> API calls so both services share one
    // trace; Next.js's own fetch span injects nothing.
    new UndiciInstrumentation({
      ignoreRequestHook: (request) =>
        isNextTelemetryHost(undiciHost(request.origin)),
    }),
  ];
}

/**
 * Next.js also wraps every server fetch in its own CLIENT span. With undici
 * instrumented that is a second `dependencies` row per call, so Next's span is
 * turned off unless NEXT_OTEL_FETCH_DISABLED is set explicitly.
 */
function disableDuplicateNextFetchSpans(): void {
  if (!process.env.NEXT_OTEL_FETCH_DISABLED?.trim()) {
    process.env.NEXT_OTEL_FETCH_DISABLED = "1";
  }
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
 * One NodeSDK for every host. Azure Monitor and OTLP are exporters on the same
 * tracer and logger providers, so spans and TelemetryLogger records reach App
 * Insights and/or a collector with one resource.
 */
export class TelemetrySdk {
  name = "none";
  /** Whether an Azure or OTLP log exporter was built (JSON stdout excluded). */
  exportsLogs = false;
  /** Whether log records reach any destination, JSON stdout included. */
  hasLogPipeline = false;
  private sdk: NodeSDK | undefined;
  private spanProcessors: SpanProcessor[] = [];
  private logProcessors: LogRecordProcessor[] = [];

  /**
   * Builds exporters and the NodeSDK without registering anything global; call
   * start() to register.
   * @throws when no exporter is configured, or none of them could be built
   */
  initialize(resource: Resource): NodeSDK {
    if (
      !TelemetryConfig.azureConnectionString() &&
      !TelemetryConfig.isOtlpConfigured()
    ) {
      throw new Error(
        "No telemetry exporter configured. Set APPLICATIONINSIGHTS_CONNECTION_STRING and/or OTEL_EXPORTER_OTLP_ENDPOINT.",
      );
    }

    const pipelines = buildPipelines();
    if (pipelines.destinations.size === 0) {
      throw new Error(
        "No telemetry exporter could be created. Check APPLICATIONINSIGHTS_CONNECTION_STRING and OTEL_EXPORTER_OTLP_*.",
      );
    }

    this.sdk = new NodeSDK({
      resource,
      // The initializer already ran resource detection.
      autoDetectResources: false,
      spanProcessors: pipelines.spanProcessors,
      // NodeSDK owns and registers the LoggerProvider for these processors. An
      // empty list still matters: omitted, NodeSDK builds an env-driven OTLP
      // logger provider (default http/protobuf to localhost:4318).
      logRecordProcessors: pipelines.logProcessors,
      // Hub exports no metrics; omitted, NodeSDK adds an OTLP metric reader.
      metricReaders: [],
      contextManager: new AsyncLocalStorageContextManager(),
      sampler: buildSampler(),
      instrumentations: buildInstrumentations(),
    });

    this.name = [...pipelines.destinations].join(" + ");
    this.exportsLogs = pipelines.exportsLogs;
    this.hasLogPipeline = pipelines.logProcessors.length > 0;
    this.spanProcessors = pipelines.spanProcessors;
    this.logProcessors = pipelines.logProcessors;
    return this.sdk;
  }

  /** Registers the tracer and logger providers and enables instrumentation. */
  start(): void {
    if (!this.sdk) {
      throw new Error("TelemetrySdk.start() called before initialize()");
    }
    disableDuplicateNextFetchSpans();
    this.sdk.start();
  }

  forceFlush(): Promise<void> {
    return settleAll(
      [...this.spanProcessors, ...this.logProcessors].map((processor) =>
        processor.forceFlush(),
      ),
    );
  }

  shutdown(): Promise<void> {
    return this.sdk?.shutdown() ?? Promise.resolve();
  }
}
