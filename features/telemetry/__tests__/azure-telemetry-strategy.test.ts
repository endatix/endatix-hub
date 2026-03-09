import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Resource, resourceFromAttributes } from "@opentelemetry/resources";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { FilteringSpanProcessor } from "../infrastructure/filtering-span-processor";

const mockUseAzureMonitor = vi.fn();
vi.mock("@azure/monitor-opentelemetry", () => ({
  useAzureMonitor: (options: unknown) => mockUseAzureMonitor(options),
}));

import { AzureTelemetryStrategy } from "../infrastructure/strategies";

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

  it("should call useAzureMonitor and return null", () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=e5a33aeb-9056-4881-8155-d2ee13542a4f;EndpointSuffix=core.windows.net";

    const strategy = new AzureTelemetryStrategy();
    const result = strategy.initialize(resource);

    expect(result).toBeNull();
    expect(mockUseAzureMonitor).toHaveBeenCalledWith(
      expect.objectContaining({
        azureMonitorExporterOptions: {
          connectionString:
            "InstrumentationKey=e5a33aeb-9056-4881-8155-d2ee13542a4f;EndpointSuffix=core.windows.net",
        },
        resource,
        spanProcessors: expect.any(Array),
      }),
    );
    expect(mockUseAzureMonitor.mock.calls[0][0].spanProcessors).toHaveLength(1);
    expect(
      mockUseAzureMonitor.mock.calls[0][0].spanProcessors[0],
    ).toBeInstanceOf(FilteringSpanProcessor);
    expect(strategy.name).toBe("Azure AppInsights");
  });

  it("should throw an error if the connection string is not configured", () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = undefined;

    const strategy = new AzureTelemetryStrategy();
    expect(() => strategy.initialize(resource)).toThrow(
      "APPLICATIONINSIGHTS_CONNECTION_STRING is not configured",
    );
    expect(mockUseAzureMonitor).not.toHaveBeenCalled();
  });
});
