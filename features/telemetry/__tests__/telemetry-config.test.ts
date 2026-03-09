import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TelemetryConfig } from "../infrastructure/telemetry-config";

describe("TelemetryConfig", () => {
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
  });

  afterEach(() => {
    process.env = envBackup;
  });

  it("exposes SERVICE_NAME constant", () => {
    expect(TelemetryConfig.SERVICE_NAME).toBe("endatix-hub");
  });

  it("isAzureConfigured returns true when APPLICATIONINSIGHTS_CONNECTION_STRING is set", () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=abc";
    expect(TelemetryConfig.isAzureConfigured()).toBe(true);
  });

  it("isAzureConfigured returns false when APPLICATIONINSIGHTS_CONNECTION_STRING is unset", () => {
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    expect(TelemetryConfig.isAzureConfigured()).toBe(false);
  });

  it("isOtelConfigured returns true when OTEL_EXPORTER_OTLP_ENDPOINT is set", () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
    expect(TelemetryConfig.isOtelConfigured()).toBe(true);
  });

  it("isOtelConfigured returns false when OTEL_EXPORTER_OTLP_ENDPOINT is unset", () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    expect(TelemetryConfig.isOtelConfigured()).toBe(false);
  });
});
