import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

export type OtlpSignal = "TRACES" | "LOGS";
export type OtlpProtocol = "grpc" | "http/protobuf" | "http/json";

const OTLP_PROTOCOLS = new Set<OtlpProtocol>([
  "grpc",
  "http/protobuf",
  "http/json",
]);

const DEFAULT_OTLP_PROTOCOL: OtlpProtocol = "grpc";
/** The `@azure/monitor-opentelemetry` distro default Hub replaced. */
const AZURE_DEFAULT_TRACES_PER_SECOND = 5;

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

  /**
   * Whether a gRPC exporter for `signal` should use plaintext.
   *
   * `OTEL_EXPORTER_OTLP_[SIGNAL_]INSECURE` decides when set. Otherwise `http://`
   * and a scheme-less `host:port` are plaintext. The OTel SDK would use TLS for a
   * scheme-less endpoint; Hub keeps plaintext, as it always has, so existing
   * `OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317` deployments keep exporting.
   * `https://` is always TLS.
   */
  otlpGrpcPlaintext(signal: OtlpSignal): boolean {
    const endpoint =
      readEnv(`OTEL_EXPORTER_OTLP_${signal}_ENDPOINT`) ??
      readEnv("OTEL_EXPORTER_OTLP_ENDPOINT") ??
      "";
    if (endpoint.toLowerCase().startsWith("https://")) {
      return false;
    }

    const insecure = (
      readEnv(`OTEL_EXPORTER_OTLP_${signal}_INSECURE`) ??
      readEnv("OTEL_EXPORTER_OTLP_INSECURE")
    )?.toLowerCase();
    if (insecure === "true" || insecure === "false") {
      return insecure === "true";
    }

    return (
      endpoint.toLowerCase().startsWith("http://") ||
      !/^[a-z][a-z0-9+.-]*:\/\//i.test(endpoint)
    );
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

  /**
   * Traces per second for the rate-limited sampler, or undefined for no rate limit.
   *
   * Precedence: `TELEMETRY_TRACES_PER_SECOND` (`0` = no limit) → a standard
   * `OTEL_TRACES_SAMPLER`, which NodeSDK applies itself → 5/s when Azure is
   * configured (the old distro default) → no limit.
   */
  tracesPerSecond(): number | undefined {
    const raw = readEnv("TELEMETRY_TRACES_PER_SECOND");
    if (raw !== undefined) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed > 0 ? parsed : undefined;
      }
      console.warn(
        `Invalid TELEMETRY_TRACES_PER_SECOND "${raw}"; expected a number >= 0. Ignoring it.`,
      );
    }

    if (this.envSamplerConfigured()) {
      return undefined;
    }
    return this.azureConnectionString()
      ? AZURE_DEFAULT_TRACES_PER_SECOND
      : undefined;
  },

  /** `OTEL_TRACES_SAMPLER` is set; NodeSDK builds that sampler from env. */
  envSamplerConfigured(): boolean {
    return !!readEnv("OTEL_TRACES_SAMPLER");
  },

  serviceName(): string {
    return readEnv("OTEL_SERVICE_NAME") ?? this.SERVICE_NAME;
  },
};
