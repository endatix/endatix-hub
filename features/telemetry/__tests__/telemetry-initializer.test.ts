import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  MockInstance,
} from "vitest";
import { TelemetryInitializer } from "../infrastructure/telemetry-initializer";
import { NodeSdkTelemetryStrategy } from "../infrastructure/strategies";

vi.mock("../infrastructure/strategies", () => ({
  NodeSdkTelemetryStrategy: vi.fn().mockImplementation(function () {
    return {
      initialize: vi.fn(() => ({
        start: vi.fn(),
        shutdown: vi.fn(() => Promise.resolve()),
      })),
      name: "Azure AppInsights",
    };
  }),
}));

describe("TelemetryInitializer", () => {
  let envBackup: NodeJS.ProcessEnv;
  let consoleError: MockInstance;
  let consoleWarn: MockInstance;
  let consoleLog: MockInstance;

  beforeEach(() => {
    envBackup = { ...process.env };
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_SDK_DISABLED;
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = envBackup;
    vi.clearAllMocks();
  });

  it("selects NodeSdkTelemetryStrategy when Azure is configured", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "test-conn";

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(NodeSdkTelemetryStrategy).toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Azure"));
  });

  it("selects NodeSdkTelemetryStrategy when OTel is configured", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(NodeSdkTelemetryStrategy).toHaveBeenCalled();
  });

  it("starts the SDK so Azure logs can flush on shutdown", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "test-conn";
    const start = vi.fn();
    const shutdown = vi.fn(() => Promise.resolve());
    (
      NodeSdkTelemetryStrategy as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      }
    ).mockImplementation(function () {
      return {
        initialize: vi.fn(() => ({ start, shutdown })),
        name: "Azure AppInsights",
      };
    });

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(start).toHaveBeenCalled();
  });

  it("does not start when OTEL_SDK_DISABLED is set", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "test-conn";
    process.env.OTEL_SDK_DISABLED = "true";

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(NodeSdkTelemetryStrategy).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(
      expect.stringContaining("OTEL_SDK_DISABLED"),
    );
  });

  it("logs a warning if no strategy is configured", () => {
    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(consoleWarn).toHaveBeenCalledWith(
      "No telemetry strategy configured",
    );
    expect(consoleLog).not.toHaveBeenCalledWith(
      expect.stringContaining("Telemetry SDK started"),
    );
  });

  it("logs an error if strategy initialization throws", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "test-conn";
    (
      NodeSdkTelemetryStrategy as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      }
    ).mockImplementation(function () {
      return {
        initialize: () => {
          throw new Error("Init failed");
        },
        name: "Azure AppInsights",
      };
    });

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to initialize telemetry:",
      expect.any(Error),
    );
  });

  it("flushes on SIGTERM without exiting, leaving the drain to Next.js", async () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "test-conn";
    delete process.env.NEXT_MANUAL_SIG_HANDLE;
    const forceFlush = vi.fn(() => Promise.resolve());
    const shutdown = vi.fn(() => Promise.resolve());
    (
      NodeSdkTelemetryStrategy as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      }
    ).mockImplementation(function () {
      return {
        initialize: vi.fn(() => ({ start: vi.fn(), shutdown })),
        forceFlush,
        name: "Azure AppInsights",
      };
    });
    const signalHandlers = new Map<string, () => void>();
    vi.spyOn(process, "once").mockImplementation(((
      event: string,
      handler: () => void,
    ) => {
      signalHandlers.set(event, handler);
      return process;
    }) as typeof process.once);
    vi.spyOn(process, "on").mockImplementation(
      (() => process) as typeof process.on,
    );
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);

    // Act
    new TelemetryInitializer().initialize();
    signalHandlers.get("SIGTERM")?.();
    await Promise.resolve();

    // Assert
    expect(signalHandlers.has("SIGTERM")).toBe(true);
    expect(forceFlush).toHaveBeenCalled();
    expect(shutdown).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("gives the strategy a detected resource with OTEL_RESOURCE_ATTRIBUTES", () => {
    // Arrange
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";
    process.env.OTEL_RESOURCE_ATTRIBUTES =
      "deployment.environment.name=staging";
    const initialize = vi.fn(() => ({ start: vi.fn(), shutdown: vi.fn() }));
    (
      NodeSdkTelemetryStrategy as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      }
    ).mockImplementation(function () {
      return { initialize, name: "OTel" };
    });
    vi.spyOn(process, "once").mockImplementation(
      (() => process) as typeof process.once,
    );
    vi.spyOn(process, "on").mockImplementation(
      (() => process) as typeof process.on,
    );

    // Act
    new TelemetryInitializer().initialize();

    // Assert
    const resource = (initialize.mock.calls[0] as unknown[])[0] as {
      attributes: Record<string, unknown>;
    };
    expect(resource.attributes["deployment.environment.name"]).toBe("staging");
    expect(resource.attributes["service.name"]).toBe("endatix-hub");
    expect(resource.attributes["host.name"]).toBeDefined();
    vi.restoreAllMocks();
  });
});
