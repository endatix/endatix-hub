import {
  detectResources,
  envDetector,
  hostDetector,
  processDetector,
  Resource,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { TelemetryConfig } from "./telemetry-config";
import { TelemetryInitStrategy } from "./strategies/telemetry-init-strategy.interface";
import { NodeSdkTelemetryStrategy } from "./strategies";
import { TelemetryLogger } from "./telemetry-logger";

/**
 * Upper bound for flushing telemetry before a crash exit. Exporters retry with
 * their own (longer) timeouts; a crashing process must not hang on them.
 */
export const CRASH_FLUSH_TIMEOUT_MS = 5_000;

/**
 * Starts telemetry for the Node.js server and wires it to process lifecycle events.
 */
export class TelemetryInitializer {
  private readonly strategy: TelemetryInitStrategy | null;

  constructor() {
    this.strategy = TelemetryConfig.hasActiveExporter()
      ? new NodeSdkTelemetryStrategy()
      : null;
  }

  /**
   * Build, start and wire telemetry. Never throws: telemetry failing to start
   * must not stop Hub from serving requests.
   */
  initialize(): void {
    // OTEL_LOG_LEVEL is applied by the NodeSDK constructor; setting the diag logger
    // here as well makes the SDK print "logger will be overwritten" stack traces.
    if (TelemetryConfig.isSdkDisabled()) {
      console.log("OpenTelemetry SDK disabled (OTEL_SDK_DISABLED)");
      return;
    }

    if (!this.strategy) {
      console.warn("No telemetry strategy configured");
      return;
    }

    try {
      this.strategy.initialize(buildResource()).start();
      this.registerCrashHandlers(this.strategy);
      this.registerSignalHandlers(this.strategy);
      console.log(`Telemetry SDK started in ${this.strategy.name} mode`);
    } catch (error) {
      console.error("Failed to initialize telemetry:", error);
    }
  }

  /**
   * Record uncaught exceptions and unhandled rejections as OTel logs
   * (exception.* attributes).
   */
  private registerCrashHandlers(strategy: TelemetryInitStrategy): void {
    // `once`: a second exception while flushing falls through to Node's default
    // handler and ends the process instead of queueing another flush.
    process.once("uncaughtException", (error: Error) => {
      TelemetryLogger.error("Uncaught exception", error, {}, "instrumentation");
      void settleWithin(strategy.shutdown(), CRASH_FLUSH_TIMEOUT_MS).finally(
        () => process.exit(1),
      );
    });

    // Next.js installs its own unhandledRejection listener at server start, so this
    // one does not change whether the process survives a rejection — it only
    // records it.
    process.on("unhandledRejection", (reason: unknown) => {
      TelemetryLogger.error(
        "Unhandled promise rejection",
        reason instanceof Error ? reason : new Error(String(reason)),
        {},
        "instrumentation",
      );
    });
  }

  /**
   * Flush telemetry when the process is asked to stop.
   *
   * Next.js owns SIGTERM/SIGINT: its handler stops accepting connections, drains
   * in-flight requests and then exits with 143/130. Hub must not call
   * process.exit() here — that would cut the drain short and report exit code 0.
   * A flush (not a shutdown) exports what is buffered now and keeps the pipelines
   * open for records emitted while requests finish.
   *
   * With NEXT_MANUAL_SIG_HANDLE the app owns signals; adding a listener would
   * suppress Node's default termination, so Hub stays out of it.
   */
  private registerSignalHandlers(strategy: TelemetryInitStrategy): void {
    if (process.env.NEXT_MANUAL_SIG_HANDLE) {
      return;
    }

    const flush = () => {
      strategy
        .forceFlush()
        .catch((error) => console.error("Error flushing telemetry", error));
    };

    process.once("SIGTERM", flush);
    process.once("SIGINT", flush);
  }
}

/**
 * Resource shared by spans and logs. Detected once here so both providers agree;
 * envDetector applies OTEL_RESOURCE_ATTRIBUTES and OTEL_SERVICE_NAME.
 *
 * No deployment.environment.name default: NODE_ENV is "production" in every built
 * image, staging included. Set it with OTEL_RESOURCE_ATTRIBUTES instead.
 */
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

/**
 * Resolves once `promise` settles or `timeoutMs` passes, whichever is first.
 * Never rejects.
 */
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
