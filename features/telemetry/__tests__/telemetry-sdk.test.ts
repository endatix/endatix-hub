import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trace } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPProtoTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPLogExporter as OTLPGrpcLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as OTLPJsonLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import {
  AlwaysOnSampler,
  ParentBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { FilteringSpanProcessor } from "../infrastructure/filtering-span-processor";
import { JsonConsoleLogRecordExporter } from "../infrastructure/json-console-log-record-exporter";
import { TelemetrySdk } from "../infrastructure/telemetry-sdk";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

const INVALID_AZURE = "invalid";

vi.mock("@azure/monitor-opentelemetry-exporter", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@azure/monitor-opentelemetry-exporter")
    >();
  class FakeAzureExporter {
    constructor(public options: { connectionString: string }) {
      if (options.connectionString === "invalid") {
        throw new Error("Invalid connection string");
      }
    }
    export(_items: unknown[], done: (result: { code: number }) => void): void {
      done({ code: 0 });
    }
    shutdown(): Promise<void> {
      return Promise.resolve();
    }
    forceFlush(): Promise<void> {
      return Promise.resolve();
    }
  }
  return {
    AzureMonitorTraceExporter: FakeAzureExporter,
    AzureMonitorLogExporter: FakeAzureExporter,
    RateLimitedSampler: actual.RateLimitedSampler,
  };
});

// Real instrumentations patch node:http and subscribe to undici diagnostics
// channels in their constructors, and NodeSDK.shutdown() never undoes that. Fakes
// keep the worker clean and expose the config Hub passes.
vi.mock("@opentelemetry/instrumentation-http", () => ({
  HttpInstrumentation: class {
    instrumentationName = "@opentelemetry/instrumentation-http";
    constructor(public config: Record<string, (arg: unknown) => boolean>) {}
    getConfig() {
      return this.config;
    }
    setTracerProvider(): void {}
    setMeterProvider(): void {}
    setLoggerProvider(): void {}
    enable(): void {}
    disable(): void {}
  },
}));
vi.mock("@opentelemetry/instrumentation-undici", () => ({
  UndiciInstrumentation: class {
    instrumentationName = "@opentelemetry/instrumentation-undici";
    constructor(public config: Record<string, (arg: unknown) => boolean>) {}
    getConfig() {
      return this.config;
    }
    setTracerProvider(): void {}
    setMeterProvider(): void {}
    setLoggerProvider(): void {}
    enable(): void {}
    disable(): void {}
  },
}));

const AZURE = "InstrumentationKey=test";
const OTLP_GRPC = "http://localhost:4317";

type FakeInstrumentation = {
  instrumentationName: string;
  config: Record<string, (arg: unknown) => boolean>;
};

/** Private NodeSDK fields read to assert what Hub wired. */
type NodeSdkInternals = {
  _instrumentations: FakeInstrumentation[];
  _meterProviderConfig?: { readers: unknown[] };
  _loggerProviderConfig?: {
    logRecordProcessors: Array<{ _exporter?: unknown }>;
  };
  _configuration: {
    sampler?: unknown;
    spanProcessors: Array<{ _exporter?: unknown }>;
  };
};

function traceExporters(sdk: NodeSdkInternals): unknown[] {
  return sdk._configuration.spanProcessors
    .map((processor) => processor._exporter)
    .filter(Boolean);
}

function logExporters(sdk: NodeSdkInternals): unknown[] {
  return (sdk._loggerProviderConfig?.logRecordProcessors ?? []).map(
    (processor) => processor._exporter,
  );
}

function instrumentation(
  sdk: NodeSdkInternals,
  name: string,
): FakeInstrumentation {
  const found = sdk._instrumentations.find(
    (i) => i.instrumentationName === name,
  );
  if (!found) {
    throw new Error(`${name} is not registered`);
  }
  return found;
}

describe("TelemetrySdk", () => {
  const resource: Resource = resourceFromAttributes({
    [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.SERVICE_NAME,
  });
  let created: TelemetrySdk[] = [];

  beforeEach(() => {
    stubEmptyTelemetryEnv();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await Promise.all(created.map((sdk) => sdk.shutdown()));
    created = [];
    logs.disable();
    trace.disable();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function initialize(): { telemetry: TelemetrySdk; sdk: NodeSdkInternals } {
    const telemetry = new TelemetrySdk();
    created.push(telemetry);
    const sdk = telemetry.initialize(resource) as unknown as NodeSdkInternals;
    return { telemetry, sdk };
  }

  describe("exporter selection", () => {
    it("wires Azure trace and log exporters", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

      // Act
      const { telemetry, sdk } = initialize();

      // Assert
      expect(telemetry.name).toBe("Azure AppInsights");
      expect(telemetry.exportsLogs).toBe(true);
      expect(traceExporters(sdk)).toHaveLength(1);
      expect(logExporters(sdk)).toHaveLength(1);
    });

    it("fans out to Azure and OTLP when both are set", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

      // Act
      const { telemetry, sdk } = initialize();

      // Assert
      expect(telemetry.name).toBe("Azure AppInsights + OTel");
      expect(traceExporters(sdk)).toHaveLength(2);
      expect(logExporters(sdk)).toHaveLength(2);
    });

    it("defaults OTLP to gRPC when no protocol is set", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

      // Act
      const { telemetry, sdk } = initialize();

      // Assert
      expect(telemetry.name).toBe("OTel");
      expect(traceExporters(sdk)).toEqual([expect.any(OTLPGrpcTraceExporter)]);
      expect(logExporters(sdk)).toEqual([expect.any(OTLPGrpcLogExporter)]);
    });

    it("honours OTEL_EXPORTER_OTLP_PROTOCOL and per-signal overrides", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318");
      vi.stubEnv("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
      vi.stubEnv("OTEL_EXPORTER_OTLP_LOGS_PROTOCOL", "http/json");

      // Act
      const { sdk } = initialize();

      // Assert
      expect(traceExporters(sdk)).toEqual([expect.any(OTLPProtoTraceExporter)]);
      expect(logExporters(sdk)).toEqual([expect.any(OTLPJsonLogExporter)]);
    });

    it("exports only the signal whose own endpoint is set", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", OTLP_GRPC);

      // Act
      const { sdk } = initialize();

      // Assert
      expect(traceExporters(sdk)).toHaveLength(0);
      expect(logExporters(sdk)).toHaveLength(1);
    });

    it("keeps OTLP when the Azure exporter constructor throws", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", INVALID_AZURE);
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

      // Act
      const { telemetry, sdk } = initialize();

      // Assert
      expect(telemetry.name).toBe("OTel");
      expect(traceExporters(sdk)).toEqual([expect.any(OTLPGrpcTraceExporter)]);
      expect(logExporters(sdk)).toEqual([expect.any(OTLPGrpcLogExporter)]);
      expect(console.error).toHaveBeenCalledWith(
        "Failed to create Azure Monitor trace exporter; skipping it:",
        expect.any(Error),
      );
    });

    it("reports no log export when only OTLP traces are configured", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", OTLP_GRPC);

      // Act
      const { telemetry } = initialize();

      // Assert
      expect(telemetry.exportsLogs).toBe(false);
      expect(telemetry.hasLogPipeline).toBe(false);
    });

    it("throws when no exporter is configured", () => {
      // Arrange
      const telemetry = new TelemetrySdk();

      // Act
      const act = () => telemetry.initialize(resource);

      // Assert
      expect(act).toThrow("No telemetry exporter configured");
      expect(telemetry.name).toBe("none");
    });

    it("throws when every configured exporter fails to build", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", INVALID_AZURE);
      const telemetry = new TelemetrySdk();

      // Act
      const act = () => telemetry.initialize(resource);

      // Assert
      expect(act).toThrow("No telemetry exporter could be created");
    });
  });

  it("adds JSON stdout only when TELEMETRY_CONSOLE_FALLBACK is true", () => {
    // Arrange
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
    const quiet = initialize();
    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");

    // Act
    const forced = initialize();

    // Assert
    expect(logExporters(quiet.sdk)).not.toContainEqual(
      expect.any(JsonConsoleLogRecordExporter),
    );
    expect(logExporters(forced.sdk)).toContainEqual(
      expect.any(JsonConsoleLogRecordExporter),
    );
    expect(forced.telemetry.hasLogPipeline).toBe(true);
  });

  it("runs the noise filter before any exporting span processor", () => {
    // Arrange
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

    // Act
    const { sdk } = initialize();

    // Assert
    expect(sdk._configuration.spanProcessors[0]).toBeInstanceOf(
      FilteringSpanProcessor,
    );
  });

  it("builds no metric reader", () => {
    // Arrange
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

    // Act
    const { sdk } = initialize();

    // Assert
    expect(sdk._meterProviderConfig?.readers).toEqual([]);
  });

  describe("sampling", () => {
    it("rate-limits Azure at 5 traces/s by default", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

      // Act
      const { sdk } = initialize();

      // Assert
      expect(String(sdk._configuration.sampler)).toBe("RateLimitedSampler{5}");
    });

    it("keeps every trace for OTLP-only with no sampler configured", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);

      // Act
      const { sdk } = initialize();

      // Assert
      expect(sdk._configuration.sampler).toBeInstanceOf(ParentBasedSampler);
      expect(String(sdk._configuration.sampler)).toContain(
        new AlwaysOnSampler().toString(),
      );
    });

    it("leaves sampling to OTEL_TRACES_SAMPLER when it is set", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("OTEL_TRACES_SAMPLER", "parentbased_traceidratio");

      // Act
      const { sdk } = initialize();

      // Assert
      expect(sdk._configuration.sampler).toBeUndefined();
    });
  });

  describe("instrumentation", () => {
    beforeEach(() => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
    });

    it("instruments undici so Hub -> API fetches carry traceparent", () => {
      // Act
      const { sdk } = initialize();

      // Assert
      expect(sdk._instrumentations.map((i) => i.instrumentationName)).toEqual([
        "@opentelemetry/instrumentation-http",
        "@opentelemetry/instrumentation-undici",
      ]);
    });

    it.each([
      ["/_next/static/chunks/app.js", true],
      ["/forms?_rsc=abc", false],
      ["/api/health", true],
      ["/forms/42", false],
    ])("ignores incoming %s: %s", (url, ignored) => {
      // Arrange
      const { sdk } = initialize();
      const http = instrumentation(sdk, "@opentelemetry/instrumentation-http");

      // Act
      const result = http.config.ignoreIncomingRequestHook({ url });

      // Assert
      expect(result).toBe(ignored);
    });

    it("ignores outgoing calls to Next.js telemetry by exact host", () => {
      // Arrange
      const { sdk } = initialize();
      const http = instrumentation(sdk, "@opentelemetry/instrumentation-http");
      const undici = instrumentation(
        sdk,
        "@opentelemetry/instrumentation-undici",
      );

      // Act & Assert
      expect(
        http.config.ignoreOutgoingRequestHook({
          host: "telemetry.nextjs.org:443",
        }),
      ).toBe(true);
      expect(
        http.config.ignoreOutgoingRequestHook({ hostname: "api.example.com" }),
      ).toBe(false);
      expect(
        undici.config.ignoreRequestHook({
          origin: "https://telemetry.nextjs.org",
        }),
      ).toBe(true);
      expect(
        undici.config.ignoreRequestHook({
          origin: "https://telemetry.nextjs.org.evil.example",
        }),
      ).toBe(false);
    });
  });

  describe("start", () => {
    it("turns off Next.js's duplicate fetch spans unless configured", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      const { telemetry } = initialize();

      // Act
      telemetry.start();

      // Assert
      expect(process.env.NEXT_OTEL_FETCH_DISABLED).toBe("1");
    });

    it("keeps an explicit NEXT_OTEL_FETCH_DISABLED", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("NEXT_OTEL_FETCH_DISABLED", "0");
      const { telemetry } = initialize();

      // Act
      telemetry.start();

      // Assert
      expect(process.env.NEXT_OTEL_FETCH_DISABLED).toBe("0");
    });

    it("routes the global Logs API to Hub's processors", async () => {
      // Arrange — Azure is faked, so nothing waits on a network export.
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");
      const { telemetry } = initialize();
      // Vitest's own console forwarding waits on write callbacks, so the stub
      // must still call them.
      const write = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(
          (_chunk, encodingOrCallback?: unknown, callback?: unknown) => {
            const done = [encodingOrCallback, callback].find(
              (arg): arg is () => void => typeof arg === "function",
            );
            done?.();
            return true;
          },
        );
      telemetry.start();

      // Act
      logs.getLogger("canary").emit({
        body: "json-stdout-canary",
        severityNumber: SeverityNumber.INFO,
      });
      await telemetry.forceFlush();

      // Assert
      expect(
        write.mock.calls.some(([chunk]) =>
          String(chunk).includes("json-stdout-canary"),
        ),
      ).toBe(true);
    });

    it("throws when called before initialize", () => {
      // Act & Assert
      expect(() => new TelemetrySdk().start()).toThrow("before initialize");
    });
  });

  describe("lifecycle", () => {
    it("flushes every span and log processor, even when one fails", async () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
      const { sdk, telemetry } = initialize();
      const processors = [
        ...sdk._configuration.spanProcessors,
        ...(sdk._loggerProviderConfig?.logRecordProcessors ?? []),
      ] as unknown as Array<{ forceFlush: () => Promise<void> }>;
      const [failing, ...others] = processors;
      vi.spyOn(failing, "forceFlush").mockRejectedValue(
        new Error("flush failed"),
      );
      const flushes = others.map((processor) =>
        vi.spyOn(processor, "forceFlush").mockResolvedValue(undefined),
      );

      // Act
      const result = telemetry.forceFlush();

      // Assert
      await expect(result).rejects.toThrow("flush failed");
      expect(flushes.length).toBeGreaterThan(1);
      for (const flush of flushes) {
        expect(flush).toHaveBeenCalled();
      }
    });

    it("shuts the NodeSDK down", async () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", OTLP_GRPC);
      const telemetry = new TelemetrySdk();
      const sdk = telemetry.initialize(resource);
      const shutdown = vi.spyOn(sdk, "shutdown").mockResolvedValue();

      // Act
      await telemetry.shutdown();

      // Assert
      expect(shutdown).toHaveBeenCalled();
    });

    it("resolves flush and shutdown before initialize", async () => {
      // Arrange
      const telemetry = new TelemetrySdk();

      // Act & Assert
      await expect(telemetry.forceFlush()).resolves.toBeUndefined();
      await expect(telemetry.shutdown()).resolves.toBeUndefined();
    });
  });
});
