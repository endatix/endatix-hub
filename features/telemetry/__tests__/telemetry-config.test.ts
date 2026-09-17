import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

describe("TelemetryConfig", () => {
  beforeEach(() => {
    stubEmptyTelemetryEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("exposes SERVICE_NAME constant", () => {
    expect(TelemetryConfig.SERVICE_NAME).toBe("endatix-hub");
  });

  describe("Azure", () => {
    it("is configured when APPLICATIONINSIGHTS_CONNECTION_STRING is set", () => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        " InstrumentationKey=abc ",
      );

      expect(TelemetryConfig.isAzureConfigured()).toBe(true);
      expect(TelemetryConfig.azureConnectionString()).toBe(
        "InstrumentationKey=abc",
      );
    });

    it.each(["", "   "])("is not configured for %j", (value) => {
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", value);

      expect(TelemetryConfig.isAzureConfigured()).toBe(false);
      expect(TelemetryConfig.azureConnectionString()).toBeUndefined();
    });
  });

  describe("OTLP", () => {
    it("is configured for every signal by the generic endpoint", () => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");

      expect(TelemetryConfig.isOtelConfigured()).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("TRACES")).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("LOGS")).toBe(true);
    });

    it("is configured for one signal by that signal's endpoint", () => {
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
      );

      expect(TelemetryConfig.isOtelConfigured()).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("TRACES")).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("LOGS")).toBe(false);
    });

    it("is not configured without an endpoint", () => {
      expect(TelemetryConfig.isOtelConfigured()).toBe(false);
    });

    it("defaults the protocol to grpc", () => {
      expect(TelemetryConfig.otlpProtocol("TRACES")).toBe("grpc");
    });

    it("prefers the signal-specific protocol over the generic one", () => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
      vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL", "HTTP/JSON");

      expect(TelemetryConfig.otlpProtocol("TRACES")).toBe("http/json");
      expect(TelemetryConfig.otlpProtocol("LOGS")).toBe("http/protobuf");
    });

    it("falls back to grpc with a warning on an unknown protocol", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("OTEL_EXPORTER_OTLP_PROTOCOL", "thrift");

      expect(TelemetryConfig.otlpProtocol("LOGS")).toBe("grpc");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("thrift"));
    });
  });

  it.each([
    ["true", true],
    ["TRUE", true],
    [" true ", true],
    ["1", false],
    ["false", false],
    ["", false],
  ])("isSdkDisabled(%j) is %s, matching the OTel spec", (value, expected) => {
    vi.stubEnv("OTEL_SDK_DISABLED", value);

    expect(TelemetryConfig.isSdkDisabled()).toBe(expected);
  });

  describe("hasActiveExporter", () => {
    it("is true when an exporter is configured", () => {
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");

      expect(TelemetryConfig.hasActiveExporter()).toBe(true);
    });

    it("is false when no exporter is configured", () => {
      expect(TelemetryConfig.hasActiveExporter()).toBe(false);
    });

    it("is false for traces-only OTLP (logs still use console fallback)", () => {
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
      );

      expect(TelemetryConfig.hasActiveExporter()).toBe(true);
      expect(TelemetryConfig.hasActiveLogExporter()).toBe(false);
    });

    it("is false when the SDK is disabled", () => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=abc",
      );
      vi.stubEnv("OTEL_SDK_DISABLED", "true");

      expect(TelemetryConfig.hasActiveExporter()).toBe(false);
      expect(TelemetryConfig.hasActiveLogExporter()).toBe(false);
    });
  });

  it.each([
    ["true", true],
    ["false", false],
    ["", false],
  ])("isConsoleOutputForced(%j) is %s", (value, expected) => {
    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", value);

    expect(TelemetryConfig.isConsoleOutputForced()).toBe(expected);
  });

  it("uses OTEL_SERVICE_NAME, else endatix-hub", () => {
    expect(TelemetryConfig.serviceName()).toBe("endatix-hub");

    vi.stubEnv("OTEL_SERVICE_NAME", "hub-staging");

    expect(TelemetryConfig.serviceName()).toBe("hub-staging");
  });
});
