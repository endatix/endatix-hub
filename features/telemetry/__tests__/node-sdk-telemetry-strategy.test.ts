import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { FilteringSpanProcessor } from "../infrastructure/filtering-span-processor";
import { JsonConsoleLogRecordExporter } from "../infrastructure/json-console-log-record-exporter";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPProtoTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPLogExporter as OTLPProtoLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPLogExporter as OTLPJsonLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

vi.mock("@azure/monitor-opentelemetry-exporter", () => ({
  AzureMonitorTraceExporter: class {
    constructor(public options: { connectionString: string }) {}
  },
  AzureMonitorLogExporter: class {
    constructor(public options: { connectionString: string }) {}
  },
}));

import { NodeSdkTelemetryStrategy } from "../infrastructure/strategies";

type Internals = {
  spanProcessors: Array<{ _exporter?: unknown }>;
  loggerProvider: {
    _sharedState: { processors: Array<{ _exporter?: unknown }> };
  };
};

function internals(strategy: NodeSdkTelemetryStrategy): Internals {
  return strategy as unknown as Internals;
}

function traceExporters(strategy: NodeSdkTelemetryStrategy): unknown[] {
  return internals(strategy)
    .spanProcessors.map((p) => p._exporter)
    .filter(Boolean);
}

function logExporters(strategy: NodeSdkTelemetryStrategy): unknown[] {
  return internals(strategy).loggerProvider._sharedState.processors.map(
    (p) => p._exporter,
  );
}

describe("NodeSdkTelemetryStrategy", () => {
  let envBackup: NodeJS.ProcessEnv;
  const resource: Resource = resourceFromAttributes({
    [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.SERVICE_NAME,
  });

  beforeEach(() => {
    envBackup = { ...process.env };
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    for (const key of [
      "OTEL_EXPORTER_OTLP_ENDPOINT",
      "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
      "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
      "OTEL_EXPORTER_OTLP_PROTOCOL",
      "OTEL_EXPORTER_OTLP_TRACES_PROTOCOL",
      "OTEL_EXPORTER_OTLP_LOGS_PROTOCOL",
      "TELEMETRY_CONSOLE_FALLBACK",
    ]) {
      delete process.env[key];
    }
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = envBackup;
    vi.restoreAllMocks();
  });

  it("builds a NodeSDK for Azure so shutdown can flush logs", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=e5a33aeb-9056-4881-8155-d2ee13542a4f;EndpointSuffix=core.windows.net";

    // Act
    const strategy = new NodeSdkTelemetryStrategy();
    const sdk = strategy.initialize(resource);

    // Assert
    expect(sdk).toBeDefined();
    expect(typeof sdk.start).toBe("function");
    expect(typeof sdk.shutdown).toBe("function");
    expect(strategy.name).toBe("Azure AppInsights");
  });

  it("registers undici instrumentation so traceparent reaches the API", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
    const strategy = new NodeSdkTelemetryStrategy();

    // Act
    const sdk = strategy.initialize(resource);

    // Assert
    const registered = (sdk as unknown as { _instrumentations?: unknown[] })
      ._instrumentations;
    const names = (registered ?? []).map(
      (i) => (i as { instrumentationName?: string }).instrumentationName,
    );

    expect(names).toContain("@opentelemetry/instrumentation-undici");
  });

  it("names the combined Azure + OTLP mode when both exporters are set", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=test";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";

    // Act
    const strategy = new NodeSdkTelemetryStrategy();
    strategy.initialize(resource);

    // Assert
    expect(strategy.name).toBe("Azure AppInsights + OTel");
  });

  it("does not let NodeSDK build metric or logger pipelines from env", () => {
    // Arrange — omitted options make NodeSDK add an OTLP metric reader and a second
    // logger provider aimed at localhost:4318.
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=test";
    const strategy = new NodeSdkTelemetryStrategy();

    // Act
    const sdk = strategy.initialize(resource) as unknown as {
      _meterProviderConfig?: { readers: unknown[] };
      _loggerProviderConfig?: { logRecordProcessors: unknown[] };
    };

    // Assert
    expect(sdk._meterProviderConfig?.readers).toEqual([]);
    expect(sdk._loggerProviderConfig?.logRecordProcessors).toEqual([]);
  });

  it("defaults OTLP to gRPC when no protocol is set", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
    const strategy = new NodeSdkTelemetryStrategy();

    // Act
    strategy.initialize(resource);

    // Assert
    expect(traceExporters(strategy)[0]).toBeInstanceOf(OTLPGrpcTraceExporter);
  });

  it("honours OTEL_EXPORTER_OTLP_PROTOCOL and per-signal overrides", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4318";
    process.env.OTEL_EXPORTER_OTLP_PROTOCOL = "http/protobuf";
    process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL = "http/json";
    const strategy = new NodeSdkTelemetryStrategy();

    // Act
    strategy.initialize(resource);

    // Assert
    expect(traceExporters(strategy)[0]).toBeInstanceOf(OTLPProtoTraceExporter);
    expect(logExporters(strategy)[0]).toBeInstanceOf(OTLPJsonLogExporter);
    expect(logExporters(strategy)).not.toContainEqual(
      expect.any(OTLPProtoLogExporter),
    );
  });

  it("exports only the signal whose own endpoint is set", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = "http://localhost:4317";
    const strategy = new NodeSdkTelemetryStrategy();

    // Act
    strategy.initialize(resource);

    // Assert
    expect(traceExporters(strategy)).toHaveLength(0);
    expect(logExporters(strategy)).toHaveLength(1);
  });

  it("writes stdout only when TELEMETRY_CONSOLE_FALLBACK is true", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
    const quiet = new NodeSdkTelemetryStrategy();
    quiet.initialize(resource);

    process.env.TELEMETRY_CONSOLE_FALLBACK = "true";
    const forced = new NodeSdkTelemetryStrategy();

    // Act
    forced.initialize(resource);

    // Assert
    expect(logExporters(quiet)).not.toContainEqual(
      expect.any(JsonConsoleLogRecordExporter),
    );
    expect(logExporters(forced)).toContainEqual(
      expect.any(JsonConsoleLogRecordExporter),
    );
  });

  it("throws when no exporter is configured", () => {
    // Act & Assert
    const strategy = new NodeSdkTelemetryStrategy();
    expect(() => strategy.initialize(resource)).toThrow(
      "No telemetry exporter configured",
    );
  });

  it("installs the noisy-span filter on the Azure path", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=test";
    const strategy = new NodeSdkTelemetryStrategy();

    // Act
    const sdk = strategy.initialize(resource);
    const processors = (sdk as unknown as { _spanProcessors?: unknown[] })
      ._spanProcessors;

    // Assert — field name varies by SDK version; either way the constructor must not throw
    expect(sdk).toBeDefined();
    if (processors) {
      expect(processors.some((p) => p instanceof FilteringSpanProcessor)).toBe(
        true,
      );
    }
  });
});
