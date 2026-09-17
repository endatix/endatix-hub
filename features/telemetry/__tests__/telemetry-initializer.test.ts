import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";
import {
  EXIT_FLUSH_TIMEOUT_MS,
  ExitFlush,
  settleWithin,
  TelemetryInitializer,
} from "../infrastructure/telemetry-initializer";
import { TelemetrySdk } from "../infrastructure/telemetry-sdk";
import { TelemetryLogger } from "../infrastructure/telemetry-logger";
import { TelemetryRuntime } from "../infrastructure/telemetry-runtime";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

vi.mock("../infrastructure/telemetry-sdk", () => ({
  TelemetrySdk: vi.fn(),
}));

type Listener = (...args: unknown[]) => void;

interface FakeSdk {
  initialize: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  forceFlush: ReturnType<typeof vi.fn>;
  shutdown: ReturnType<typeof vi.fn>;
  name: string;
  hasLogPipeline: boolean;
}

/** Makes `new TelemetrySdk()` return a controllable fake. */
function useFakeSdk(
  overrides: Partial<
    Pick<FakeSdk, "initialize" | "start" | "hasLogPipeline">
  > = {},
): FakeSdk {
  const fake: FakeSdk = {
    initialize: vi.fn(),
    start: vi.fn(),
    forceFlush: vi.fn(() => Promise.resolve()),
    shutdown: vi.fn(() => Promise.resolve()),
    name: "Azure AppInsights",
    hasLogPipeline: true,
    ...overrides,
  };
  vi.mocked(TelemetrySdk).mockImplementation(function () {
    return fake as unknown as TelemetrySdk;
  } as never);
  return fake;
}

/** Captures process listeners instead of registering them on the test runner. */
function captureProcessListeners(): Map<string, Listener> {
  const listeners = new Map<string, Listener>();
  const capture = ((event: string, listener: Listener) => {
    listeners.set(event, listener);
    return process;
  }) as never;
  vi.spyOn(process, "on").mockImplementation(capture);
  vi.spyOn(process, "once").mockImplementation(capture);
  return listeners;
}

function stubExit(): MockInstance {
  return vi
    .spyOn(process, "exit")
    .mockImplementation((() => undefined) as never);
}

describe("TelemetryInitializer", () => {
  let consoleError: MockInstance;
  let consoleWarn: MockInstance;
  let consoleLog: MockInstance;
  let listeners: Map<string, Listener>;
  let exitFlush: ExitFlush;

  beforeEach(() => {
    stubEmptyTelemetryEnv();
    vi.mocked(TelemetrySdk).mockReset();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(TelemetryLogger, "info").mockImplementation(() => {});
    listeners = captureProcessListeners();
  });

  afterEach(() => {
    exitFlush?.disarm();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /** Creates the initializer after process.exit is stubbed, so disarm restores the stub. */
  function createInitializer(): TelemetryInitializer {
    exitFlush = new ExitFlush();
    return new TelemetryInitializer(exitFlush);
  }

  describe("startup", () => {
    it.each([
      ["APPLICATIONINSIGHTS_CONNECTION_STRING", "InstrumentationKey=x"],
      ["OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"],
      ["OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", "http://localhost:4317"],
    ])("starts the SDK when %s is set", (key, value) => {
      // Arrange
      vi.stubEnv(key, value);
      const sdk = useFakeSdk();

      // Act
      createInitializer().initialize();

      // Assert
      expect(sdk.initialize).toHaveBeenCalled();
      expect(sdk.start).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith(
        "Telemetry SDK started in Azure AppInsights mode",
      );
      expect(TelemetryLogger.info).toHaveBeenCalledWith(
        "Telemetry SDK started in Azure AppInsights mode",
        { mode: "Azure AppInsights" },
        "instrumentation",
      );
    });

    it.each([true, false])(
      "marks the log pipeline active=%s from what the SDK built",
      (hasLogPipeline) => {
        // Arrange
        vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
        useFakeSdk({ hasLogPipeline });

        // Act
        createInitializer().initialize();

        // Assert
        expect(TelemetryRuntime.isLogPipelineActive()).toBe(hasLogPipeline);
      },
    );

    it("does not build a TelemetrySdk when OTEL_SDK_DISABLED is true", () => {
      // Arrange
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=x",
      );
      vi.stubEnv("OTEL_SDK_DISABLED", "true");

      // Act
      createInitializer().initialize();

      // Assert
      expect(TelemetrySdk).not.toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith(
        "OpenTelemetry SDK disabled (OTEL_SDK_DISABLED)",
      );
    });

    it("warns and registers nothing when no exporter is configured", () => {
      // Act
      createInitializer().initialize();

      // Assert
      expect(consoleWarn).toHaveBeenCalledWith(
        "No telemetry exporter configured",
      );
      expect(listeners.size).toBe(0);
    });

    it.each(["initialize", "start"] as const)(
      "logs, registers nothing and leaves the log pipeline inactive when %s throws",
      (failingStep) => {
        // Arrange
        vi.stubEnv(
          "APPLICATIONINSIGHTS_CONNECTION_STRING",
          "InstrumentationKey=x",
        );
        useFakeSdk({
          [failingStep]: vi.fn(() => {
            throw new Error("Init failed");
          }),
        });

        // Act
        const act = () => createInitializer().initialize();

        // Assert
        expect(act).not.toThrow();
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to initialize telemetry:",
          expect.any(Error),
        );
        expect(listeners.size).toBe(0);
        expect(TelemetryRuntime.isLogPipelineActive()).toBe(false);
      },
    );

    it("gives the SDK a detected resource that includes OTEL_RESOURCE_ATTRIBUTES", () => {
      // Arrange
      vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
      vi.stubEnv(
        "OTEL_RESOURCE_ATTRIBUTES",
        "deployment.environment.name=staging",
      );
      const sdk = useFakeSdk();

      // Act
      createInitializer().initialize();

      // Assert
      const [resource] = sdk.initialize.mock.calls[0] as [
        { attributes: Record<string, unknown> },
      ];
      expect(resource.attributes).toMatchObject({
        "service.name": "endatix-hub",
        "process.runtime.name": "nodejs",
        "deployment.environment.name": "staging",
      });
      expect(resource.attributes["host.name"]).toBeDefined();
    });
  });

  describe("signals", () => {
    beforeEach(() => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=x",
      );
    });

    it.each(["SIGTERM", "SIGINT"])(
      "flushes on %s without exiting, leaving the drain to Next.js",
      (signal) => {
        // Arrange
        const exit = stubExit();
        const sdk = useFakeSdk();
        createInitializer().initialize();

        // Act
        listeners.get(signal)?.(signal);

        // Assert
        expect(TelemetryLogger.info).toHaveBeenCalledWith(
          `Telemetry flushing on ${signal}`,
          { signal },
          "instrumentation",
        );
        expect(sdk.forceFlush).toHaveBeenCalled();
        expect(sdk.shutdown).not.toHaveBeenCalled();
        expect(exit).not.toHaveBeenCalled();
      },
    );

    it("reports a failed flush instead of rejecting unhandled", async () => {
      // Arrange
      const sdk = useFakeSdk();
      sdk.forceFlush.mockRejectedValue(new Error("collector down"));
      createInitializer().initialize();

      // Act
      listeners.get("SIGTERM")?.("SIGTERM");
      await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());

      // Assert
      expect(consoleError).toHaveBeenCalledWith(
        "Error flushing telemetry",
        expect.objectContaining({ message: "collector down" }),
      );
    });

    it("shuts telemetry down before Next's post-drain process.exit completes", async () => {
      // Arrange
      const exit = stubExit();
      const sdk = useFakeSdk();
      createInitializer().initialize();
      listeners.get("SIGTERM")?.("SIGTERM");

      // Act
      process.exit(143);

      // Assert
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(143));
      expect(sdk.shutdown).toHaveBeenCalledTimes(1);
      expect(sdk.shutdown.mock.invocationCallOrder[0]).toBeLessThan(
        exit.mock.invocationCallOrder[0],
      );
    });

    it("leaves process.exit native until a termination signal arrives", () => {
      // Arrange
      const exit = stubExit();
      const sdk = useFakeSdk();
      createInitializer().initialize();

      // Act
      process.exit(1);

      // Assert
      expect(exit).toHaveBeenCalledWith(1);
      expect(sdk.shutdown).not.toHaveBeenCalled();
    });

    it("leaves signals alone when NEXT_MANUAL_SIG_HANDLE is set", () => {
      // Arrange
      vi.stubEnv("NEXT_MANUAL_SIG_HANDLE", "true");
      useFakeSdk();

      // Act
      createInitializer().initialize();

      // Assert
      expect(listeners.has("SIGTERM")).toBe(false);
      expect(listeners.has("SIGINT")).toBe(false);
    });
  });

  describe("process errors", () => {
    beforeEach(() => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=x",
      );
    });

    it("logs an uncaught exception and keeps the SDK and the process running", () => {
      // Arrange
      const exit = stubExit();
      const sdk = useFakeSdk();
      const logError = vi
        .spyOn(TelemetryLogger, "error")
        .mockImplementation(() => {});
      createInitializer().initialize();
      const error = new Error("boom");

      // Act
      listeners.get("uncaughtException")?.(error);
      listeners.get("uncaughtException")?.(new Error("again"));

      // Assert
      expect(logError).toHaveBeenCalledWith(
        "Uncaught exception",
        error,
        {},
        "instrumentation",
      );
      expect(logError).toHaveBeenCalledTimes(2);
      expect(sdk.shutdown).not.toHaveBeenCalled();
      expect(exit).not.toHaveBeenCalled();
    });

    it("passes a non-Error rejection reason through for TelemetryLogger to describe", () => {
      // Arrange
      const exit = stubExit();
      useFakeSdk();
      const logError = vi
        .spyOn(TelemetryLogger, "error")
        .mockImplementation(() => {});
      createInitializer().initialize();
      const reason = { code: "E_API", message: "boom" };

      // Act
      listeners.get("unhandledRejection")?.(reason);

      // Assert
      expect(logError).toHaveBeenCalledWith(
        "Unhandled promise rejection",
        reason,
        {},
        "instrumentation",
      );
      expect(exit).not.toHaveBeenCalled();
    });
  });
});

describe("ExitFlush", () => {
  let exit: MockInstance;
  let exitFlush: ExitFlush;

  beforeEach(() => {
    exit = stubExit();
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitFlush = new ExitFlush();
  });

  afterEach(() => {
    exitFlush.disarm();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exits after the flush timeout when the flush hangs", async () => {
    // Arrange
    vi.useFakeTimers();
    exitFlush.arm(() => new Promise(() => undefined));

    // Act
    process.exit(143);
    await vi.advanceTimersByTimeAsync(EXIT_FLUSH_TIMEOUT_MS - 1);
    const exitedEarly = exit.mock.calls.length > 0;
    await vi.advanceTimersByTimeAsync(1);

    // Assert
    expect(exitedEarly).toBe(false);
    expect(exit).toHaveBeenCalledWith(143);
  });

  it("exits immediately on a second call while the flush is pending", () => {
    // Arrange
    const flush = vi.fn(() => new Promise<void>(() => undefined));
    exitFlush.arm(flush);

    // Act
    process.exit(143);
    process.exit(1);

    // Assert
    expect(flush).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("arms once, and disarm restores the previous process.exit", () => {
    // Arrange
    const first = vi.fn(() => Promise.resolve());
    const second = vi.fn(() => Promise.resolve());
    exitFlush.arm(first);
    const armedExit = process.exit;

    // Act
    exitFlush.arm(second);
    const afterSecondArm = process.exit;
    exitFlush.disarm();

    // Assert
    expect(afterSecondArm).toBe(armedExit);
    expect(process.exit).not.toBe(armedExit);
  });
});

describe("settleWithin", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves when the promise resolves first", async () => {
    // Act & Assert
    await expect(
      settleWithin(Promise.resolve("done"), 1_000),
    ).resolves.toBeUndefined();
  });

  it("resolves and reports when the promise rejects", async () => {
    // Arrange
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Act
    const settled = settleWithin(
      Promise.reject(new Error("export failed")),
      1_000,
    );

    // Assert
    await expect(settled).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "Error flushing telemetry before exit",
      expect.objectContaining({ message: "export failed" }),
    );
  });

  it("resolves at the timeout when the promise never settles", async () => {
    // Arrange
    vi.useFakeTimers();
    const onSettled = vi.fn();

    // Act
    void settleWithin(new Promise(() => undefined), 100).then(onSettled);
    await vi.advanceTimersByTimeAsync(99);
    const settledEarly = onSettled.mock.calls.length > 0;
    await vi.advanceTimersByTimeAsync(1);

    // Assert
    expect(settledEarly).toBe(false);
    expect(onSettled).toHaveBeenCalled();
  });
});
