import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OtelTelemetryStrategy } from "../infrastructure/strategies";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { TelemetryConfig } from '../infrastructure/telemetry-config';

describe("OtelTelemetryStrategy", () => {
  let envBackup: NodeJS.ProcessEnv;
  const resource: Resource = resourceFromAttributes({
    [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.SERVICE_NAME,
  });

  beforeEach(() => {
    envBackup = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = envBackup;
    vi.restoreAllMocks();
  });

  it("should initialize telemetry", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";

    // Act
    const strategy = new OtelTelemetryStrategy();
    const sdk = strategy.initialize(resource);

    // Assert
    expect(sdk).toBeDefined();
    expect(strategy.name).toBe("OTel");
  });

  it("should throw an error if the endpoint is not configured", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = undefined;

    // Act & Assert
    const strategy = new OtelTelemetryStrategy();
    expect(() => strategy.initialize(resource)).toThrow(
      "OTEL_EXPORTER_OTLP_ENDPOINT is not configured",
    );
  });
});
