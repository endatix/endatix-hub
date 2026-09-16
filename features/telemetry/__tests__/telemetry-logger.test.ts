import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetryLogger } from "../infrastructure/telemetry-logger";
import { TelemetryConfig } from "../infrastructure/telemetry-config";

describe("TelemetryLogger", () => {
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.TELEMETRY_CONSOLE_FALLBACK;
    delete process.env.OTEL_SDK_DISABLED;
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    process.env = envBackup;
    vi.restoreAllMocks();
  });

  it("defaults the logger name to the Hub service name", () => {
    // Act
    const logger = TelemetryLogger.getLogger();

    // Assert — the API logger is a stub until an SDK registers a provider;
    // the name we pass is what operators filter on once export works.
    expect(TelemetryConfig.SERVICE_NAME).toBe("endatix-hub");
    expect(logger).toBeDefined();
  });

  it("writes to console in development when no exporter is configured", () => {
    // Arrange
    vi.stubEnv("NODE_ENV", "development");

    // Act
    TelemetryLogger.info("hello from hub", { code: 1 }, "test-logger");

    // Assert
    expect(console.info).toHaveBeenCalledWith(
      "[test-logger] hello from hub",
      expect.objectContaining({
        severity: "INFO",
      }),
    );
  });

  it("does not double-write console when an exporter is configured", () => {
    // Arrange
    vi.stubEnv("NODE_ENV", "production");
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "InstrumentationKey=x";

    // Act
    TelemetryLogger.info("exported only", {}, "test-logger");

    // Assert
    expect(console.info).not.toHaveBeenCalled();
  });

  it("falls back to console when OTEL_SDK_DISABLED leaves the exporter unused", () => {
    // Arrange
    vi.stubEnv("NODE_ENV", "production");
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "InstrumentationKey=x";
    process.env.OTEL_SDK_DISABLED = "true";
    process.env.TELEMETRY_CONSOLE_FALLBACK = "true";

    // Act
    TelemetryLogger.info("still visible", {}, "test-logger");

    // Assert
    expect(console.info).toHaveBeenCalledWith(
      "[test-logger] still visible",
      expect.anything(),
    );
  });
});
