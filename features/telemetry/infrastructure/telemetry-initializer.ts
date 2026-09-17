import {
  detectResources,
  envDetector,
  hostDetector,
  processDetector,
  Resource,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { TelemetryConfig } from "./telemetry-config";
import { TelemetrySdk } from "./telemetry-sdk";
import { TelemetryLogger } from "./telemetry-logger";

export const CRASH_FLUSH_TIMEOUT_MS = 5_000;

export class TelemetryInitializer {
  private readonly sdk: TelemetrySdk | null;

  constructor() {
    this.sdk = TelemetryConfig.hasActiveExporter() ? new TelemetrySdk() : null;
  }

  initialize(): void {
    if (TelemetryConfig.isSdkDisabled()) {
      console.log("OpenTelemetry SDK disabled (OTEL_SDK_DISABLED)");
      return;
    }

    if (!this.sdk) {
      console.warn("No telemetry exporter configured");
      return;
    }

    try {
      this.sdk.initialize(buildResource()).start();
      this.registerCrashHandlers(this.sdk);
      this.registerSignalHandlers(this.sdk);
      const mode = this.sdk.name;
      console.log(`Telemetry SDK started in ${mode} mode`);
      TelemetryLogger.info(
        `Telemetry SDK started in ${mode} mode`,
        { mode },
        "instrumentation",
      );
    } catch (error) {
      console.error("Failed to initialize telemetry:", error);
    }
  }

  private registerCrashHandlers(sdk: TelemetrySdk): void {
    process.once("uncaughtException", (error: Error) => {
      TelemetryLogger.error("Uncaught exception", error, {}, "instrumentation");
      void settleWithin(sdk.shutdown(), CRASH_FLUSH_TIMEOUT_MS).finally(() =>
        process.exit(1),
      );
    });

    process.on("unhandledRejection", (reason: unknown) => {
      TelemetryLogger.error(
        "Unhandled promise rejection",
        reason instanceof Error ? reason : new Error(String(reason)),
        {},
        "instrumentation",
      );
    });
  }

  private registerSignalHandlers(sdk: TelemetrySdk): void {
    if (process.env.NEXT_MANUAL_SIG_HANDLE) {
      return;
    }

    const flush = (signal: string) => {
      TelemetryLogger.info(
        `Telemetry flushing on ${signal}`,
        { signal },
        "instrumentation",
      );
      sdk
        .forceFlush()
        .catch((error) => console.error("Error flushing telemetry", error));
    };

    process.once("SIGTERM", () => flush("SIGTERM"));
    process.once("SIGINT", () => flush("SIGINT"));
  }
}

function buildResource(): Resource {
  return resourceFromAttributes({
    [TelemetryConfig.ATTR_SERVICE_NAME]: TelemetryConfig.serviceName(),
    "process.runtime.name": "nodejs",
  }).merge(
    detectResources({
      detectors: [envDetector, hostDetector, processDetector],
    }),
  );
}

export function settleWithin(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
    timer.unref();
  });
  const settled = promise.then(
    () => undefined,
    (error) => console.error("Error shutting down telemetry", error),
  );

  return Promise.race([settled, timeout]).finally(() => clearTimeout(timer));
}
