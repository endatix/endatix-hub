import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TelemetryLogger,
  LogSeverity,
} from "../infrastructure/telemetry-logger";
import { stubEmptyTelemetryEnv } from "./support/telemetry-env";

const mockEmit = vi.fn();
const mockGetLogger = vi.fn((_name: string) => ({ emit: mockEmit }));
vi.mock("@opentelemetry/api-logs", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@opentelemetry/api-logs")>();
  return {
    ...actual,
    logs: { getLogger: (name: string) => mockGetLogger(name) },
  };
});

describe("TelemetryLogger", () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockGetLogger.mockClear();
    stubEmptyTelemetryEnv();
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("treats null as an error payload, not as absent", () => {
    TelemetryLogger.error("Failed", null, {}, "forms");

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Failed: null",
        attributes: expect.objectContaining({
          "exception.message": "null",
        }),
      }),
    );
  });

  it("info() emits log with INFO severity and body", () => {
    TelemetryLogger.info("hello", {}, "my-logger");

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Info,
        body: "hello",
        attributes: expect.objectContaining({ "log.type": "LogRecord" }),
      }),
    );
  });

  it("debug() emits with DEBUG severity", () => {
    TelemetryLogger.debug("debug msg", { key: "value" });

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Debug,
        body: "debug msg",
        attributes: expect.objectContaining({ key: "value" }),
      }),
    );
  });

  it("warn() emits with WARN severity", () => {
    TelemetryLogger.warn("warning", { code: 1 });

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Warning,
        body: "warning",
        attributes: expect.objectContaining({ code: 1 }),
      }),
    );
  });

  it("error() without Error emits message and ERROR severity", () => {
    TelemetryLogger.error(
      "something failed",
      undefined,
      { id: 42 },
      "err-logger",
    );

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Error,
        body: "something failed",
        attributes: expect.objectContaining({ id: 42 }),
      }),
    );
  });

  it("error() with Error sets exception attributes and combined body", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n  at file.ts:1:1";

    TelemetryLogger.error("Request failed", err, {}, "api");

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Error,
        body: "Request failed: boom",
        attributes: expect.objectContaining({
          "exception.type": "Error",
          "exception.message": "boom",
          "exception.stacktrace": "Error: boom\n  at file.ts:1:1",
        }),
      }),
    );
  });

  it("error() with unknown (non-Error) normalizes to Error and sets exception attributes", () => {
    TelemetryLogger.error("Request failed", "oops", {}, "api");

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Error,
        body: "Request failed: oops",
        attributes: expect.objectContaining({
          "exception.type": "Error",
          "exception.message": "oops",
        }),
      }),
    );
  });

  it("critical() with Error sets exception attributes and combined body", () => {
    const err = new Error("fatal");

    TelemetryLogger.critical("Unrecoverable", err, { service: "auth" });

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Critical,
        body: "Unrecoverable: fatal",
        attributes: expect.objectContaining({
          "exception.type": "Error",
          "exception.message": "fatal",
          service: "auth",
        }),
      }),
    );
  });

  it("critical() without Error emits message only", () => {
    TelemetryLogger.critical("System down");

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Critical,
        body: "System down",
      }),
    );
  });

  it("critical() with unknown (non-Error) normalizes to Error and sets exception attributes", () => {
    TelemetryLogger.critical("Crash", "timeout", {}, "core");

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        severityText: LogSeverity.Critical,
        body: "Crash: timeout",
        attributes: expect.objectContaining({
          "exception.type": "Error",
          "exception.message": "timeout",
        }),
      }),
    );
  });

  it("error() with plain object uses JSON stringification instead of [object Object]", () => {
    TelemetryLogger.error("Failed", { code: 500, detail: "Server error" }, {});

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Failed: {"code":500,"detail":"Server error"}',
        attributes: expect.objectContaining({
          "exception.message": '{"code":500,"detail":"Server error"}',
        }),
      }),
    );
  });

  it("uses console fallback in development when no telemetry exporter is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    TelemetryLogger.error(
      "Request failed",
      undefined,
      { formId: "form-1" },
      "forms",
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith("[forms] Request failed", {
      severity: LogSeverity.Error,
      attributes: expect.objectContaining({
        "log.type": "LogRecord",
        formId: "form-1",
      }),
    });
  });

  it("redacts credential-like attributes on emit", () => {
    TelemetryLogger.info(
      "Request failed",
      { authorization: "Bearer secret-token", formId: "form-1" },
      "forms",
    );

    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          authorization: "[REDACTED]",
          formId: "form-1",
        }),
      }),
    );
  });

  it("uses console fallback when only traces OTLP is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv(
      "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
      "http://localhost:4318/v1/traces",
    );
    const consoleInfoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => {});

    TelemetryLogger.info("still visible", { formId: "form-1" }, "forms");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[forms] still visible",
      expect.objectContaining({ severity: LogSeverity.Info }),
    );
  });

  it("redacts sensitive console fallback attributes", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    TelemetryLogger.error(
      "Request failed",
      undefined,
      {
        authorization: "Bearer secret-token",
        connectionString: "InstrumentationKey=secret",
        formId: "form-1",
      },
      "forms",
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith("[forms] Request failed", {
      severity: LogSeverity.Error,
      attributes: expect.objectContaining({
        authorization: "[REDACTED]",
        connectionString: "[REDACTED]",
        formId: "form-1",
      }),
    });
  });

  it("does not use console fallback when a telemetry exporter is configured", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
    const consoleInfoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => {});

    TelemetryLogger.info("Form deleted", { formId: "form-1" }, "forms");

    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });

  it("does not use console fallback in production by default", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    TelemetryLogger.error("Request failed", undefined, {}, "forms");

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("does not use console fallback in tests by default", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    TelemetryLogger.error("Request failed", undefined, {}, "forms");

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("uses console fallback in production only when explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
    vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => {});

    TelemetryLogger.warn("Using fallback path", { path: "forms" }, "forms");

    expect(consoleWarnSpy).toHaveBeenCalledWith("[forms] Using fallback path", {
      severity: LogSeverity.Warning,
      attributes: expect.objectContaining({
        path: "forms",
      }),
    });
  });

  it("uses the Hub service name when no logger name is given", () => {
    TelemetryLogger.info("hello");

    expect(mockGetLogger).toHaveBeenCalledWith("endatix-hub");
  });

  it("uses console fallback when OTEL_SDK_DISABLED leaves the exporter unused", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OTEL_SDK_DISABLED", "true");
    vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");
    const consoleInfoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => {});

    TelemetryLogger.info("still visible", {}, "forms");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[forms] still visible",
      expect.objectContaining({ severity: LogSeverity.Info }),
    );
  });

  it("writes emit failures to the console even when fallback is off", () => {
    vi.stubEnv("NODE_ENV", "production");
    mockEmit.mockImplementationOnce(() => {
      throw new Error("emit failed");
    });
    const consoleInfoSpy = vi
      .spyOn(console, "info")
      .mockImplementation(() => {});

    TelemetryLogger.info("hello", {}, "forms");

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      "[forms] hello",
      expect.anything(),
    );
  });

  it("does not throw when OTEL emit fails", () => {
    vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
    mockEmit.mockImplementationOnce(() => {
      throw new Error("emit failed");
    });

    expect(() => TelemetryLogger.info("hello")).not.toThrow();
  });
});
