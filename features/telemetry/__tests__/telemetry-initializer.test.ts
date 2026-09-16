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
  CRASH_FLUSH_TIMEOUT_MS,
  settleWithin,
  TelemetryInitializer,
} from "../infrastructure/telemetry-initializer";
import { NodeSdkTelemetryStrategy } from "../infrastructure/strategies";
import type { TelemetryInitStrategy } from "../infrastructure/strategies/telemetry-init-strategy.interface";
import { TelemetryLogger } from "../infrastructure/telemetry-logger";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

vi.mock("../infrastructure/strategies", () => ({
  NodeSdkTelemetryStrategy: vi.fn(),
}));

type Listener = (...args: unknown[]) => void;

interface FakeStrategy {
  initialize: ReturnType<typeof vi.fn>;
  forceFlush: ReturnType<typeof vi.fn>;
  shutdown: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  name: string;
}

/** Makes `new NodeSdkTelemetryStrategy()` return a controllable fake. */
function useFakeStrategy(
  overrides: Partial<Pick<FakeStrategy, "initialize" | "name">> = {},
): FakeStrategy {
  const start = vi.fn();
  const fake: FakeStrategy = {
    start,
    initialize: vi.fn(() => ({ start })),
    forceFlush: vi.fn(() => Promise.resolve()),
    shutdown: vi.fn(() => Promise.resolve()),
    name: "Azure AppInsights",
    ...overrides,
  };
  vi.mocked(NodeSdkTelemetryStrategy).mockImplementation(function () {
    return fake as unknown as TelemetryInitStrategy;
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

describe("TelemetryInitializer", () => {
  let consoleError: MockInstance;
  let consoleWarn: MockInstance;
  let consoleLog: MockInstance;
  let listeners: Map<string, Listener>;

  beforeEach(() => {
    stubEmptyTelemetryEnv();
    vi.mocked(NodeSdkTelemetryStrategy).mockReset();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    listeners = captureProcessListeners();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("strategy selection", () => {
    it.each([
      ["APPLICATIONINSIGHTS_CONNECTION_STRING", "InstrumentationKey=x"],
      ["OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"],
      ["OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", "http://localhost:4317"],
    ])("starts the SDK when %s is set", (key, value) => {
      // Arrange
      vi.stubEnv(key, value);
      const strategy = useFakeStrategy();

      // Act
      new TelemetryInitializer().initialize();

      // Assert
      expect(strategy.start).toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith(
        "Telemetry SDK started in Azure AppInsights mode",
      );
    });

    it("does not build a strategy when OTEL_SDK_DISABLED is true", () => {
      // Arrange
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=x",
      );
      vi.stubEnv("OTEL_SDK_DISABLED", "true");

      // Act
      new TelemetryInitializer().initialize();

      // Assert
      expect(NodeSdkTelemetryStrategy).not.toHaveBeenCalled();
      expect(consoleLog).toHaveBeenCalledWith(
        "OpenTelemetry SDK disabled (OTEL_SDK_DISABLED)",
      );
    });

    it("warns and registers nothing when no exporter is configured", () => {
      // Act
      new TelemetryInitializer().initialize();

      // Assert
      expect(consoleWarn).toHaveBeenCalledWith(
        "No telemetry strategy configured",
      );
      expect(listeners.size).toBe(0);
    });

    it("logs and registers nothing when the strategy throws", () => {
      // Arrange
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=x",
      );
      useFakeStrategy({
        initialize: vi.fn(() => {
          throw new Error("Init failed");
        }),
      });

      // Act
      const act = () => new TelemetryInitializer().initialize();

      // Assert
      expect(act).not.toThrow();
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to initialize telemetry:",
        expect.any(Error),
      );
      expect(listeners.size).toBe(0);
    });
  });

  it("gives the strategy a detected resource that includes OTEL_RESOURCE_ATTRIBUTES", () => {
    // Arrange
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
    vi.stubEnv(
      "OTEL_RESOURCE_ATTRIBUTES",
      "deployment.environment.name=staging",
    );
    const strategy = useFakeStrategy();

    // Act
    new TelemetryInitializer().initialize();

    // Assert
    const [resource] = strategy.initialize.mock.calls[0] as [
      { attributes: Record<string, unknown> },
    ];
    expect(resource.attributes).toMatchObject({
      "service.name": "endatix-hub",
      "process.runtime.name": "nodejs",
      "deployment.environment.name": "staging",
    });
    expect(resource.attributes["host.name"]).toBeDefined();
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
        const strategy = useFakeStrategy();
        const exit = vi
          .spyOn(process, "exit")
          .mockImplementation((() => undefined) as never);
        new TelemetryInitializer().initialize();

        // Act
        listeners.get(signal)?.();

        // Assert
        expect(strategy.forceFlush).toHaveBeenCalled();
        expect(strategy.shutdown).not.toHaveBeenCalled();
        expect(exit).not.toHaveBeenCalled();
      },
    );

    it("reports a failed flush instead of rejecting unhandled", async () => {
      // Arrange
      const strategy = useFakeStrategy();
      strategy.forceFlush.mockRejectedValue(new Error("collector down"));
      new TelemetryInitializer().initialize();

      // Act
      listeners.get("SIGTERM")?.();
      await vi.waitFor(() => expect(consoleError).toHaveBeenCalled());

      // Assert
      expect(consoleError).toHaveBeenCalledWith(
        "Error flushing telemetry",
        expect.objectContaining({ message: "collector down" }),
      );
    });

    it("leaves signals alone when NEXT_MANUAL_SIG_HANDLE is set", () => {
      // Arrange
      vi.stubEnv("NEXT_MANUAL_SIG_HANDLE", "true");
      useFakeStrategy();

      // Act
      new TelemetryInitializer().initialize();

      // Assert
      expect(listeners.has("SIGTERM")).toBe(false);
      expect(listeners.has("SIGINT")).toBe(false);
    });
  });

  describe("crashes", () => {
    beforeEach(() => {
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=x",
      );
    });

    it("logs an uncaught exception, shuts down and exits 1", async () => {
      // Arrange
      const strategy = useFakeStrategy();
      const logError = vi
        .spyOn(TelemetryLogger, "error")
        .mockImplementation(() => {});
      const exit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => undefined) as never);
      new TelemetryInitializer().initialize();
      const error = new Error("boom");

      // Act
      listeners.get("uncaughtException")?.(error);
      await vi.waitFor(() => expect(exit).toHaveBeenCalled());

      // Assert
      expect(logError).toHaveBeenCalledWith(
        "Uncaught exception",
        error,
        {},
        "instrumentation",
      );
      expect(strategy.shutdown).toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(1);
    });

    it("exits after the flush timeout when shutdown hangs", async () => {
      // Arrange
      vi.useFakeTimers();
      const strategy = useFakeStrategy();
      strategy.shutdown.mockReturnValue(new Promise(() => undefined));
      vi.spyOn(TelemetryLogger, "error").mockImplementation(() => {});
      const exit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => undefined) as never);
      new TelemetryInitializer().initialize();

      // Act
      listeners.get("uncaughtException")?.(new Error("boom"));
      await vi.advanceTimersByTimeAsync(CRASH_FLUSH_TIMEOUT_MS - 1);
      const exitedEarly = exit.mock.calls.length > 0;
      await vi.advanceTimersByTimeAsync(1);

      // Assert
      expect(exitedEarly).toBe(false);
      expect(exit).toHaveBeenCalledWith(1);
    });

    it("records unhandled rejections without exiting", () => {
      // Arrange
      useFakeStrategy();
      const logError = vi
        .spyOn(TelemetryLogger, "error")
        .mockImplementation(() => {});
      const exit = vi
        .spyOn(process, "exit")
        .mockImplementation((() => undefined) as never);
      new TelemetryInitializer().initialize();

      // Act
      listeners.get("unhandledRejection")?.("not an Error");

      // Assert
      expect(logError).toHaveBeenCalledWith(
        "Unhandled promise rejection",
        expect.objectContaining({ message: "not an Error" }),
        {},
        "instrumentation",
      );
      expect(exit).not.toHaveBeenCalled();
    });
  });
});

describe("settleWithin", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves when the promise resolves first", async () => {
    await expect(
      settleWithin(Promise.resolve("done"), 1_000),
    ).resolves.toBeUndefined();
  });

  it("resolves and reports when the promise rejects", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      settleWithin(Promise.reject(new Error("export failed")), 1_000),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      "Error shutting down telemetry",
      expect.objectContaining({ message: "export failed" }),
    );
  });

  it("resolves at the timeout when the promise never settles", async () => {
    vi.useFakeTimers();
    const onSettled = vi.fn();

    void settleWithin(new Promise(() => undefined), 100).then(onSettled);
    await vi.advanceTimersByTimeAsync(99);
    expect(onSettled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(onSettled).toHaveBeenCalled();
  });
});
