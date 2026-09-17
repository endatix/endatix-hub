import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export type OtlpSignal = "TRACES" | "LOGS";
export type OtlpProtocol = "grpc" | "http/protobuf" | "http/json";

const OTLP_PROTOCOLS = new Set<OtlpProtocol>([
  "grpc",
  "http/protobuf",
  "http/json",
]);

const DEFAULT_OTLP_PROTOCOL: OtlpProtocol = "grpc";

function readEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

export const TelemetryConfig = {
  SERVICE_NAME: "endatix-hub",
  ATTR_SERVICE_NAME,

  azureConnectionString(): string | undefined {
    return readEnv("APPLICATIONINSIGHTS_CONNECTION_STRING");
  },

  isOtlpConfigured(): boolean {
    return (
      this.isOtlpSignalConfigured("TRACES") ||
      this.isOtlpSignalConfigured("LOGS")
    );
  },

  isOtlpSignalConfigured(signal: OtlpSignal): boolean {
    return (
      !!readEnv("OTEL_EXPORTER_OTLP_ENDPOINT") ||
      !!readEnv(`OTEL_EXPORTER_OTLP_${signal}_ENDPOINT`)
    );
  },

  otlpProtocol(signal: OtlpSignal): OtlpProtocol {
    const raw =
      readEnv(`OTEL_EXPORTER_OTLP_${signal}_PROTOCOL`) ??
      readEnv("OTEL_EXPORTER_OTLP_PROTOCOL");
    if (!raw) {
      return DEFAULT_OTLP_PROTOCOL;
    }

    const protocol = raw.toLowerCase();
    if (OTLP_PROTOCOLS.has(protocol as OtlpProtocol)) {
      return protocol as OtlpProtocol;
    }

    console.warn(
      `Unsupported OTLP protocol "${raw}" for ${signal}; using ${DEFAULT_OTLP_PROTOCOL}.`,
    );
    return DEFAULT_OTLP_PROTOCOL;
  },

  isSdkDisabled(): boolean {
    return readEnv("OTEL_SDK_DISABLED")?.toLowerCase() === "true";
  },

  hasActiveExporter(): boolean {
    return (
      !this.isSdkDisabled() &&
      (!!this.azureConnectionString() || this.isOtlpConfigured())
    );
  },

  hasActiveLogExporter(): boolean {
    return (
      !this.isSdkDisabled() &&
      (!!this.azureConnectionString() || this.isOtlpSignalConfigured("LOGS"))
    );
  },

  consoleFallbackEnabled(): boolean {
    return readEnv("TELEMETRY_CONSOLE_FALLBACK") === "true";
  },

  serviceName(): string {
    return readEnv("OTEL_SERVICE_NAME") ?? this.SERVICE_NAME;
  },
};
