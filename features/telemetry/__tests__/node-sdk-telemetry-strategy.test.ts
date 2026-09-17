import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { logs } from "@opentelemetry/api-logs";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPProtoTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPLogExporter as OTLPGrpcLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as OTLPJsonLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { FilteringSpanProcessor } from "../infrastructure/filtering-span-processor";
import { JsonConsoleLogRecordExporter } from "../infrastructure/json-console-log-record-exporter";
import { NodeSdkTelemetryStrategy } from "../infrastructure/strategies";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

const INVALID_AZURE = "invalid";

vi.mock("@azure/monitor-opentelemetry-exporter", () => {
  class FakeAzureExporter {
    constructor(public options: { connectionString: string }) {
      if (options.connectionString === "invalid") {
        throw new Error("Invalid connection string");
      }
    }
  }
  return {
    AzureMonitorTraceExporter: FakeAzureExporter,
    AzureMonitorLogExporter: FakeAzureExporter,
  };
});

const AZURE = "InstrumentationKey=test";
const OTLP_GRPC = "http://localhost:4317";

/** Private fields the strategy keeps; read here to assert what was wired. */
type StrategyInternals = {
  spanProcessors: Array<{ _exporter?: unknown }>;
  loggerProvider: {
    _sharedState: { processors: Array<{ _exporter?: unknown }> };
    forceFlush(): Promise<void>;
    shutdown(): Promise<void>;
  };
};

type SdkInternals = {
  _instrumentations: Array<{ instrumentationName?: string }>;
  _meterProviderConfig?: { readers: unknown[] };
  _loggerProviderConfig?: { logRecordProcessors: unknown[] };
};

function internals(strategy: NodeSdkTelemetryStrategy): StrategyInternals {
  return strategy as unknown as StrategyInternals;
}

function spanProcessors(strategy: NodeSdkTelemetryStrategy) {
  return internals(strategy).spanProcessors;
}

function traceExporters(strategy: NodeSdkTelemetryStrategy): unknown[] {
  return spanProcessors(strategy)
    .map((processor) => processor._exporter)
    .filter(Boolean);
}

function logExporters(strategy: NodeSdkTelemetryStrategy): unknown[] {
  return internals(strategy).loggerProvider._sharedState.processors.map(
    (processor) => processor._exporter,
  );
}

describe("NodeSdkTelemetryStrategy", () => {
  const resource: Resource = resourceFromAttributes({
    [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.SERVICE_NAME,
  });

  beforeEach(() => {
    stubEmptyTelemetryEnv();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logs.disable();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function initialize(): {
    strategy: NodeSdkTelemetryStrategy;
    sdk: SdkInternals;
  } {
    const strategy = new NodeSdkTelemetryStrategy();
    const sdk = strategy.initialize(resource) as unknown as SdkInternals;
    return { strategy, sdk };
  }

  describe("exporter selection", () => {
    it("wires Azure trace and log exporters", () => {
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

      const { strategy } = initialize();

      expect(strategy.name).toBe("Azure AppInsights");
      expect(traceExporters(strategy)).toHaveLength(1);
      expect(logExporters(strategy)).toHaveLength(1);
    });

    it("fans out to Azure and OTLP when both are set", () => {
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

      const { strategy } = initialize();

      expect(strategy.name).toBe("Azure AppInsights + OTel");
      expect(traceExporters(strategy)).toHaveLength(2);
      expect(logExporters(strategy)).toHaveLength(2);
    });

    it("defaults OTLP to gRPC when no protocol is set", () => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

      const { strategy } = initialize();

      expect(strategy.name).toBe("OTel");
      expect(traceExporters(strategy)).toEqual([
        expect.any(OTLPGrpcTraceExporter),
      ]);
      expect(logExporters(strategy)).toEqual([expect.any(OTLPGrpcLogExporter)]);
    });

    it("honours OTEL_EXPORTER_OTLP_PROTOCOL and per-signal overrides", () => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318");
      vi.stubEnv("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
      vi.stubEnv("OTEL_EXPORTER_OTLP_LOGS_PROTOCOL", "http/json");

      const { strategy } = initialize();

      expect(traceExporters(strategy)).toEqual([
        expect.any(OTLPProtoTraceExporter),
      ]);
      expect(logExporters(strategy)).toEqual([expect.any(OTLPJsonLogExporter)]);
    });

    it("exports only the signal whose own endpoint is set", () => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", OTLP_GRPC);

      const { strategy } = initialize();

      expect(traceExporters(strategy)).toHaveLength(0);
      expect(logExporters(strategy)).toHaveLength(1);
    });

    it("throws when no exporter is configured", () => {
      const strategy = new NodeSdkTelemetryStrategy();

      expect(() => strategy.initialize(resource)).toThrow(
        "No telemetry exporter configured",
      );
      expect(strategy.name).toBe("none");
    });
  });

  it("writes JSON stdout only when TELEMETRY_CONSOLE_FALLBACK is true", () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
    const quiet = initialize().strategy;

    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");
    const forced = initialize().strategy;

    expect(logExporters(quiet)).not.toContainEqual(
      expect.any(JsonConsoleLogRecordExporter),
    );
    expect(logExporters(forced)).toContainEqual(
      expect.any(JsonConsoleLogRecordExporter),
    );
  });

  it("runs the noisy-span filter before any exporting processor", () => {
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

    const { strategy } = initialize();

    expect(spanProcessors(strategy)[0]).toBeInstanceOf(FilteringSpanProcessor);
  });

  it("does not let NodeSDK build metric or logger pipelines from env", () => {
    // Omitted options make NodeSDK add an OTLP metric reader and a second logger
    // provider aimed at localhost:4318.
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

    const { sdk } = initialize();

    expect(sdk._meterProviderConfig?.readers).toEqual([]);
    expect(sdk._loggerProviderConfig?.logRecordProcessors).toEqual([]);
  });

  it("registers undici instrumentation so traceparent reaches the API", () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

    const { sdk } = initialize();

    expect(sdk._instrumentations.map((i) => i.instrumentationName)).toContain(
      "@opentelemetry/instrumentation-undici",
    );
  });

  it("registers nothing global when an exporter constructor throws", () => {
    // Arrange
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", INVALID_AZURE);
    const setProvider = vi.spyOn(logs, "setGlobalLoggerProvider");
    const strategy = new NodeSdkTelemetryStrategy();

    // Act & Assert
    expect(() => strategy.initialize(resource)).toThrow(
      "Invalid connection string",
    );
    expect(setProvider).not.toHaveBeenCalled();
  });

  describe("lifecycle", () => {
    it("flushes every span processor and the logger provider", async () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
      const { strategy } = initialize();
      const flushes = [
        ...spanProcessors(strategy),
        internals(strategy).loggerProvider,
      ].map((target) =>
        vi
          .spyOn(target as { forceFlush: () => Promise<void> }, "forceFlush")
          .mockResolvedValue(undefined),
      );

      // Act
      await strategy.forceFlush();

      // Assert
      for (const flush of flushes) {
        expect(flush).toHaveBeenCalled();
      }
    });

    it("keeps flushing the others when one pipeline fails, then rejects", async () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
      const { strategy } = initialize();
      const [first, ...rest] = spanProcessors(strategy) as unknown as Array<{
        forceFlush: () => Promise<void>;
      }>;
      vi.spyOn(first, "forceFlush").mockRejectedValue(
        new Error("flush failed"),
      );
      const others = rest.map((processor) =>
        vi.spyOn(processor, "forceFlush").mockResolvedValue(undefined),
      );
      const logFlush = vi
        .spyOn(internals(strategy).loggerProvider, "forceFlush")
        .mockResolvedValue();

      // Act & Assert
      await expect(strategy.forceFlush()).rejects.toThrow("flush failed");
      for (const other of others) {
        expect(other).toHaveBeenCalled();
      }
      expect(logFlush).toHaveBeenCalled();
    });

    it("shuts down the SDK and the logger provider it does not own", async () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
      const strategy = new NodeSdkTelemetryStrategy();
      const sdk = strategy.initialize(resource);
      const sdkShutdown = vi.spyOn(sdk, "shutdown").mockResolvedValue();
      const logShutdown = vi
        .spyOn(internals(strategy).loggerProvider, "shutdown")
        .mockResolvedValue();

      // Act
      await strategy.shutdown();

      // Assert
      expect(sdkShutdown).toHaveBeenCalled();
      expect(logShutdown).toHaveBeenCalled();
    });

    it("resolves flush and shutdown before initialize", async () => {
      const strategy = new NodeSdkTelemetryStrategy();

      await expect(strategy.forceFlush()).resolves.toBeUndefined();
      await expect(strategy.shutdown()).resolves.toBeUndefined();
    });
  });
});
