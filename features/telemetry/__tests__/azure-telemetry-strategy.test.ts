import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AzureTelemetryStrategy } from "../infrastructure/strategies";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { TelemetryConfig } from '../infrastructure/telemetry-config';

describe("AzureTelemetryStrategy", () => {
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
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=e5a33aeb-9056-4881-8155-d2ee13542a4f;EndpointSuffix=core.windows.net";
    
    // Act
    const strategy = new AzureTelemetryStrategy();
    const sdk = strategy.initialize(resource);

    // Assert
    expect(sdk).toBeDefined();
    expect(strategy.name).toBe("Azure AppInsights");
  });

  it("should throw an error if the connection string is not configured", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = undefined;

    // Act & Assert
    const strategy = new AzureTelemetryStrategy();
    expect(() => strategy.initialize(resource)).toThrow(
      "APPLICATIONINSIGHTS_CONNECTION_STRING is not configured",
    );
  });
});
