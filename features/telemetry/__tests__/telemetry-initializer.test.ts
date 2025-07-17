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
import {
  AzureTelemetryStrategy,
  OtelTelemetryStrategy,
} from "../infrastructure/strategies";

vi.mock("../infrastructure/strategies", () => ({
  AzureTelemetryStrategy: vi.fn(() => ({
    initialize: vi.fn(() => ({
      start: vi.fn(),
      shutdown: vi.fn(() => Promise.resolve()),
    })),
    name: "Azure",
  })),
  OtelTelemetryStrategy: vi.fn(() => ({
    initialize: vi.fn(() => ({
      start: vi.fn(),
      shutdown: vi.fn(() => Promise.resolve()),
    })),
    name: "OTel",
  })),
}));

describe("TelemetryInitializer", () => {
  let envBackup: NodeJS.ProcessEnv;
  let consoleError: MockInstance;
  let consoleWarn: MockInstance;
  let consoleLog: MockInstance;

  beforeEach(() => {
    envBackup = { ...process.env };
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = envBackup;
    vi.restoreAllMocks();
  });

  it("selects AzureTelemetryStrategy if Azure is configured", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = "test-conn";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = undefined;

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(AzureTelemetryStrategy).toHaveBeenCalled();
    expect(OtelTelemetryStrategy).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Azure"));
  });

  it("selects OtelTelemetryStrategy if OTel is configured", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = undefined;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://localhost:4317";

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(OtelTelemetryStrategy).toHaveBeenCalled();
    expect(AzureTelemetryStrategy).not.toHaveBeenCalled();
    expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("OTel"));
  });

  it("logs a warning if no strategy is configured", () => {
    // Arrange
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = undefined;
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = undefined;

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
      AzureTelemetryStrategy as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      }
    ).mockImplementation(() => ({
      initialize: () => {
        throw new Error("Init failed");
      },
      name: "Azure AppInsights",
    }));

    // Act
    const initializer = new TelemetryInitializer();
    initializer.initialize();

    // Assert
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to initialize telemetry:",
      expect.any(Error),
    );
  });
});
