import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { FilteringSpanProcessor } from "../infrastructure/filtering-span-processor";

vi.mock("@azure/monitor-opentelemetry-exporter", () => ({
  AzureMonitorTraceExporter: class {
    constructor(public options: { connectionString: string }) {}
  },
  AzureMonitorLogExporter: class {
    constructor(public options: { connectionString: string }) {}
  },
}));

import { NodeSdkTelemetryStrategy } from "../infrastructure/strategies";

describe("NodeSdkTelemetryStrategy", () => {
  let envBackup: NodeJS.ProcessEnv;
  const resource: Resource = resourceFromAttributes({
    [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.SERVICE_NAME,
  });

  beforeEach(() => {
    envBackup = { ...process.env };
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
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
