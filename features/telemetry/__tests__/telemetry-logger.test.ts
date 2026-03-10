import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TelemetryLogger,
  LogSeverity,
  parseErrorMessage,
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

describe("parseErrorMessage", () => {
  it("returns message for built-in Error", () => {
    expect(parseErrorMessage(new Error("something broke"))).toBe(
      "something broke",
    );
  });

  it("returns message for Error with empty message", () => {
    expect(parseErrorMessage(new Error(""))).toBe("");
  });

  it("returns primitives as string for null and undefined", () => {
    expect(parseErrorMessage(null)).toBe("null");
    expect(parseErrorMessage(undefined)).toBe("undefined");
  });

  it("returns string values as-is", () => {
    expect(parseErrorMessage("")).toBe("");
    expect(parseErrorMessage("hello")).toBe("hello");
    expect(parseErrorMessage("multi\nline")).toBe("multi\nline");
  });

  it("returns string for number and boolean literals", () => {
    expect(parseErrorMessage(0)).toBe("0");
    expect(parseErrorMessage(42)).toBe("42");
    expect(parseErrorMessage(-1)).toBe("-1");
    expect(parseErrorMessage(3.14)).toBe("3.14");
    expect(parseErrorMessage(true)).toBe("true");
    expect(parseErrorMessage(false)).toBe("false");
  });

  it("uses .message when object has string message property", () => {
    expect(parseErrorMessage({ message: "custom error" })).toBe("custom error");
    expect(parseErrorMessage({ message: "" })).toBe("");
  });

  it("uses JSON.stringify for plain object without message", () => {
    expect(parseErrorMessage({ code: 500 })).toBe('{"code":500}');
    expect(parseErrorMessage({ a: 1, b: "two" })).toBe('{"a":1,"b":"two"}');
    expect(parseErrorMessage({})).toBe("{}");
  });

  it("avoids [object Object] for plain object", () => {
    const result = parseErrorMessage({ foo: "bar" });
    expect(result).not.toBe("[object Object]");
    expect(result).toBe('{"foo":"bar"}');
  });

  it("handles custom Error subclass", () => {
    class CustomError extends Error {
      constructor(msg: string) {
        super(msg);
        this.name = "CustomError";
      }
    }
    expect(parseErrorMessage(new CustomError("custom"))).toBe("custom");
  });

  it("handles circular object with explicit [Circular] sentinel", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(parseErrorMessage(circular)).toBe("[Circular]");
  });

  it("uses String(message) for object with non-string message", () => {
    expect(parseErrorMessage({ message: 123 })).toBe("123");
    expect(parseErrorMessage({ message: null })).toBe("null");
    expect(parseErrorMessage({ message: false })).toBe("false");
  });

  it("serializes arrays via JSON.stringify", () => {
    expect(parseErrorMessage([])).toBe("[]");
    expect(parseErrorMessage([1, 2, 3])).toBe("[1,2,3]");
    expect(parseErrorMessage(["a", "b"])).toBe('["a","b"]');
    expect(parseErrorMessage([{ id: 1 }])).toBe('[{"id":1}]');
  });

  it("handles array with circular reference", () => {
    const arr: unknown[] = [1];
    arr.push(arr);
    expect(parseErrorMessage(arr)).toBe("[Circular]");
  });

  it("returns String() for symbol and bigint", () => {
    expect(parseErrorMessage(Symbol("sym"))).toContain("sym");
    expect(parseErrorMessage(BigInt("9007199254740993"))).toBe(
      "9007199254740993",
    );
  });
});
