import {
  detectResources,
  envDetector,
  hostDetector,
  processDetector,
  Resource,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import { TelemetryConfig } from "./telemetry-config";
import { TelemetryRuntime } from "./telemetry-runtime";
import { TelemetrySdk } from "./telemetry-sdk";
import { TelemetryLogger } from "./telemetry-logger";

/**
 * Upper bound for flushing before the process exits. Exporters retry with their
 * own, longer timeouts; a stopping process must not hang on them.
 */
export const EXIT_FLUSH_TIMEOUT_MS = 5_000;

const LOGGER_NAME = "instrumentation";

/**
 * Starts telemetry for the Node.js server and wires it to process lifecycle events.
 *
 * Telemetry never decides whether the process lives: Next.js installs its own
 * uncaughtException / unhandledRejection handlers that log and keep serving, and
 * its SIGTERM / SIGINT handler drains requests before exiting.
 */
export class TelemetryInitializer {
  private readonly sdk: TelemetrySdk | null;

  constructor(private readonly exitFlush = new ExitFlush()) {
    this.sdk = TelemetryConfig.hasActiveExporter() ? new TelemetrySdk() : null;
  }

  /**
   * Build, start and wire telemetry. Never throws: telemetry failing to start
   * must not stop Hub from serving requests.
   */
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
      this.sdk.initialize(buildResource());
      this.sdk.start();
    } catch (error) {
      // TelemetryRuntime stays inactive, so TelemetryLogger falls back to the
      // console instead of silently dropping every record.
      console.error("Failed to initialize telemetry:", error);
      return;
    }

    TelemetryRuntime.markLogPipelineActive(this.sdk.hasLogPipeline);
    registerErrorLogging();
    this.registerSignalHandlers(this.sdk);

    const mode = this.sdk.name;
    console.log(`Telemetry SDK started in ${mode} mode`);
    TelemetryLogger.info(
      `Telemetry SDK started in ${mode} mode`,
      { mode },
      LOGGER_NAME,
    );
  }

  /**
   * On SIGTERM / SIGINT, flush what is buffered now and arm a final flush for when
   * Next.js calls process.exit() after draining in-flight requests, so spans and
   * logs from those last requests are exported too.
   *
   * With NEXT_MANUAL_SIG_HANDLE the app owns signals; adding a listener would
   * suppress Node's default termination, so Hub stays out of it.
   */
  private registerSignalHandlers(sdk: TelemetrySdk): void {
    if (process.env.NEXT_MANUAL_SIG_HANDLE) {
      return;
    }

    const onSignal = (signal: NodeJS.Signals) => {
      TelemetryLogger.info(
        `Telemetry flushing on ${signal}`,
        { signal },
        LOGGER_NAME,
      );
      void sdk
        .forceFlush()
        .catch((error) => console.error("Error flushing telemetry", error));
      this.exitFlush.arm(() => sdk.shutdown());
    };

    process.once("SIGTERM", onSignal);
    process.once("SIGINT", onSignal);
  }
}

/**
 * Record uncaught exceptions and unhandled rejections as logs. No flush, shutdown
 * or exit: Next.js keeps serving after both, and the batch processors export the
 * record on their normal schedule. Flushing per event would turn a burst of
 * rejections (Next's late-await pattern) into a burst of exports.
 */
function registerErrorLogging(): void {
  process.on("uncaughtException", (error: Error) => {
    TelemetryLogger.error("Uncaught exception", error, {}, LOGGER_NAME);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    TelemetryLogger.error(
      "Unhandled promise rejection",
      reason,
      {},
      LOGGER_NAME,
    );
  });
}

/**
 * Delays process.exit() until telemetry is flushed, at most EXIT_FLUSH_TIMEOUT_MS.
 *
 * process.on("exit") listeners must be synchronous, and Next.js's graceful
 * shutdown ends with process.exit(143 | 130) straight after draining requests, so
 * wrapping exit is the only point after the drain where an async flush can run.
 * It is armed only once a termination signal has arrived, so any earlier exit
 * keeps Node's native, immediate behaviour. Once armed, the wrapped exit returns
 * to its caller while the flush runs, and a second call exits immediately.
 */
export class ExitFlush {
  private readonly nativeExit: typeof process.exit;
  private armed = false;

  constructor() {
    this.nativeExit = process.exit.bind(process);
  }

  arm(flush: () => Promise<void>): void {
    if (this.armed) {
      return;
    }
    this.armed = true;

    let exiting = false;
    process.exit = ((code?: number | string | null) => {
      if (exiting) {
        return this.nativeExit(code);
      }
      exiting = true;
      void settleWithin(flush(), EXIT_FLUSH_TIMEOUT_MS).finally(() =>
        this.nativeExit(code),
      );
      return undefined as never;
    }) as typeof process.exit;
  }

  /** Restores the process.exit captured at construction. */
  disarm(): void {
    process.exit = this.nativeExit;
    this.armed = false;
  }
}

/**
 * Resource shared by spans and logs. envDetector applies OTEL_RESOURCE_ATTRIBUTES
 * and OTEL_SERVICE_NAME.
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
 * Never rejects. The timer is deliberately not unref'd: while an exit is pending
 * it guarantees the exit still happens if the flush hangs.
 */
export function settleWithin(
  promise: Promise<unknown>,
  timeoutMs: number,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  const settled = promise.then(
    () => undefined,
    (error) => console.error("Error flushing telemetry before exit", error),
  );

  return Promise.race([settled, timeout]).finally(() => clearTimeout(timer));
}
