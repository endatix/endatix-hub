import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TelemetryLogger,
  LogSeverity,
} from "../infrastructure/telemetry-logger";

const mockEmit = vi.fn();
vi.mock("@opentelemetry/api-logs", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@opentelemetry/api-logs")>();
  return {
    ...actual,
    logs: { getLogger: () => ({ emit: mockEmit }) },
  };
});

describe("TelemetryLogger", () => {
  beforeEach(() => {
    mockEmit.mockClear();
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
});
