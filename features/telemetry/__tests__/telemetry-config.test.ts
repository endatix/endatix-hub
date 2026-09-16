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

  it("isOtelConfigured returns true when only a per-signal endpoint is set", () => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT =
      "http://localhost:4318/v1/traces";
    expect(TelemetryConfig.isOtelConfigured()).toBe(true);
    expect(TelemetryConfig.isOtlpSignalConfigured("LOGS")).toBe(false);
  });

  it("otlpProtocol defaults to grpc and prefers the signal-specific key", () => {
    delete process.env.OTEL_EXPORTER_OTLP_PROTOCOL;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL;
    expect(TelemetryConfig.otlpProtocol("TRACES")).toBe("grpc");

    process.env.OTEL_EXPORTER_OTLP_PROTOCOL = "http/protobuf";
    process.env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL = "http/json";
    expect(TelemetryConfig.otlpProtocol("TRACES")).toBe("http/json");
    expect(TelemetryConfig.otlpProtocol("LOGS")).toBe("http/protobuf");
  });

  it("otlpProtocol falls back to grpc on an unknown value", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.OTEL_EXPORTER_OTLP_PROTOCOL = "thrift";
    expect(TelemetryConfig.otlpProtocol("LOGS")).toBe("grpc");
  });

  it.each([
    ["true", true],
    ["TRUE", true],
    ["1", false],
    ["false", false],
    ["", false],
  ])("isSdkDisabled(%j) is %s, matching the OTel spec", (value, expected) => {
    process.env.OTEL_SDK_DISABLED = value;
    expect(TelemetryConfig.isSdkDisabled()).toBe(expected);
  });

  it("hasActiveExporter is false when the SDK is disabled", () => {
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
      "InstrumentationKey=abc";
    process.env.OTEL_SDK_DISABLED = "true";
    expect(TelemetryConfig.hasActiveExporter()).toBe(false);
  });
});
