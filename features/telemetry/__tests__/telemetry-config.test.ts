import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TelemetryConfig } from "../infrastructure/telemetry-config";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

const AZURE = "InstrumentationKey=abc";

describe("TelemetryConfig", () => {
  beforeEach(() => {
    stubEmptyTelemetryEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("exposes SERVICE_NAME constant", () => {
    // Act & Assert
    expect(TelemetryConfig.SERVICE_NAME).toBe("endatix-hub");
  });

  describe("Azure", () => {
    it("trims APPLICATIONINSIGHTS_CONNECTION_STRING", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", ` ${AZURE} `);

      // Act
      const connectionString = TelemetryConfig.azureConnectionString();

      // Assert
      expect(connectionString).toBe(AZURE);
    });

    it.each(["", "   "])("is not configured for %j", (value) => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", value);

      // Act & Assert
      expect(TelemetryConfig.azureConnectionString()).toBeUndefined();
    });
  });

  describe("OTLP endpoints and protocol", () => {
    it("is configured for every signal by the generic endpoint", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");

      // Act & Assert
      expect(TelemetryConfig.isOtlpConfigured()).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("TRACES")).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("LOGS")).toBe(true);
    });

    it("is configured for one signal by that signal's endpoint", () => {
      // Arrange
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
      );

      // Act & Assert
      expect(TelemetryConfig.isOtlpConfigured()).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("TRACES")).toBe(true);
      expect(TelemetryConfig.isOtlpSignalConfigured("LOGS")).toBe(false);
    });

    it("is not configured without an endpoint", () => {
      // Act & Assert
      expect(TelemetryConfig.isOtlpConfigured()).toBe(false);
    });

    it("defaults the protocol to grpc", () => {
      // Act & Assert
      expect(TelemetryConfig.otlpProtocol("TRACES")).toBe("grpc");
    });

    it("prefers the signal-specific protocol over the generic one", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf");
      vi.stubEnv("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL", "HTTP/JSON");

      // Act & Assert
      expect(TelemetryConfig.otlpProtocol("TRACES")).toBe("http/json");
      expect(TelemetryConfig.otlpProtocol("LOGS")).toBe("http/protobuf");
    });

    it("falls back to grpc with a warning on an unknown protocol", () => {
      // Arrange
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.stubEnv("OTEL_EXPORTER_OTLP_PROTOCOL", "thrift");

      // Act
      const protocol = TelemetryConfig.otlpProtocol("LOGS");

      // Assert
      expect(protocol).toBe("grpc");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("thrift"));
    });
  });

  describe("otlpGrpcPlaintext", () => {
    it.each([
      ["otel-collector:4317", "", true],
      ["localhost:4317", "", true],
      ["http://otel-collector:4317", "", true],
      ["https://otel.example.com", "", false],
      ["otel-collector:4317", "false", false],
      ["http://otel-collector:4317", "FALSE", false],
      ["unix:///var/run/otel.sock", "", false],
      ["unix:///var/run/otel.sock", "true", true],
      ["https://otel.example.com", "true", false],
    ])(
      "endpoint %j with OTEL_EXPORTER_OTLP_INSECURE=%j is plaintext: %s",
      (endpoint, insecure, expected) => {
        // Arrange
        vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", endpoint);
        vi.stubEnv("OTEL_EXPORTER_OTLP_INSECURE", insecure);

        // Act & Assert
        expect(TelemetryConfig.otlpGrpcPlaintext("TRACES")).toBe(expected);
      },
    );

    it("prefers the signal-specific endpoint and INSECURE flag", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://otel.example.com");
      vi.stubEnv("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", "logs-collector:4317");
      vi.stubEnv("OTEL_EXPORTER_OTLP_INSECURE", "true");
      vi.stubEnv("OTEL_EXPORTER_OTLP_LOGS_INSECURE", "false");

      // Act & Assert
      expect(TelemetryConfig.otlpGrpcPlaintext("TRACES")).toBe(false);
      expect(TelemetryConfig.otlpGrpcPlaintext("LOGS")).toBe(false);
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
    // Arrange
    vi.stubEnv("OTEL_SDK_DISABLED", value);

    // Act & Assert
    expect(TelemetryConfig.isSdkDisabled()).toBe(expected);
  });

  describe("hasActiveExporter / hasActiveLogExporter", () => {
    it("are true when OTLP is configured for every signal", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");

      // Act & Assert
      expect(TelemetryConfig.hasActiveExporter()).toBe(true);
      expect(TelemetryConfig.hasActiveLogExporter()).toBe(true);
    });

    it("are false when no exporter is configured", () => {
      // Act & Assert
      expect(TelemetryConfig.hasActiveExporter()).toBe(false);
      expect(TelemetryConfig.hasActiveLogExporter()).toBe(false);
    });

    it("configure no log export for traces-only OTLP", () => {
      // Arrange
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
      );

      // Act & Assert
      expect(TelemetryConfig.hasActiveExporter()).toBe(true);
      expect(TelemetryConfig.hasActiveLogExporter()).toBe(false);
    });

    it("are false when the SDK is disabled", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("OTEL_SDK_DISABLED", "true");

      // Act & Assert
      expect(TelemetryConfig.hasActiveExporter()).toBe(false);
      expect(TelemetryConfig.hasActiveLogExporter()).toBe(false);
    });
  });

  it.each([
    ["true", true],
    ["false", false],
    ["", false],
  ])("consoleFallbackEnabled(%j) is %s", (value, expected) => {
    // Arrange
    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", value);

    // Act & Assert
    expect(TelemetryConfig.consoleFallbackEnabled()).toBe(expected);
  });

  it("uses OTEL_SERVICE_NAME, else endatix-hub", () => {
    // Act
    const defaultName = TelemetryConfig.serviceName();
    vi.stubEnv("OTEL_SERVICE_NAME", "hub-staging");
    const overridden = TelemetryConfig.serviceName();

    // Assert
    expect(defaultName).toBe("endatix-hub");
    expect(overridden).toBe("hub-staging");
  });

  describe("tracesPerSecond", () => {
    it("is undefined (no limit) without Azure", () => {
      // Act & Assert
      expect(TelemetryConfig.tracesPerSecond()).toBeUndefined();
    });

    it("defaults to 5 with Azure, like the Azure Monitor distro", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);

      // Act & Assert
      expect(TelemetryConfig.tracesPerSecond()).toBe(5);
    });

    it.each([
      ["20", 20],
      ["0.5", 0.5],
      ["0", undefined],
    ])("uses TELEMETRY_TRACES_PER_SECOND=%j as %s", (value, expected) => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("TELEMETRY_TRACES_PER_SECOND", value);

      // Act & Assert
      expect(TelemetryConfig.tracesPerSecond()).toBe(expected);
    });

    it.each(["-1", "fast"])(
      "warns and ignores an invalid TELEMETRY_TRACES_PER_SECOND=%j",
      (value) => {
        // Arrange
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
        vi.stubEnv("TELEMETRY_TRACES_PER_SECOND", value);

        // Act
        const tracesPerSecond = TelemetryConfig.tracesPerSecond();

        // Assert
        expect(tracesPerSecond).toBe(5);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining(value));
      },
    );

    it("defers to OTEL_TRACES_SAMPLER over the Azure default", () => {
      // Arrange
      vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", AZURE);
      vi.stubEnv("OTEL_TRACES_SAMPLER", "parentbased_traceidratio");

      // Act & Assert
      expect(TelemetryConfig.envSamplerConfigured()).toBe(true);
      expect(TelemetryConfig.tracesPerSecond()).toBeUndefined();
    });

    it("lets TELEMETRY_TRACES_PER_SECOND win over OTEL_TRACES_SAMPLER", () => {
      // Arrange
      vi.stubEnv("OTEL_TRACES_SAMPLER", "always_on");
      vi.stubEnv("TELEMETRY_TRACES_PER_SECOND", "10");

      // Act & Assert
      expect(TelemetryConfig.tracesPerSecond()).toBe(10);
    });
  });
});
