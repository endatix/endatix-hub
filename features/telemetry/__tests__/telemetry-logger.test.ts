import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TelemetryLogger,
  LogSeverity,
} from "../infrastructure/telemetry-logger";
import { TelemetryRuntime } from "../infrastructure/telemetry-runtime";
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

/** An exporter is configured and its log pipeline started. */
function useRunningLogPipeline(): void {
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317");
  TelemetryRuntime.markLogPipelineActive(true);
}

/** No exporter is configured, so nothing started. */
function useNoExporter(): void {
  vi.stubEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "");
  vi.stubEnv("APPLICATIONINSIGHTS_CONNECTION_STRING", "");
  TelemetryRuntime.markLogPipelineActive(false);
}

function silenceConsole(method: "info" | "warn" | "error") {
  return vi.spyOn(console, method).mockImplementation(() => {});
}

describe("TelemetryLogger", () => {
  beforeEach(() => {
    mockEmit.mockReset();
    mockGetLogger.mockClear();
    stubEmptyTelemetryEnv();
    useRunningLogPipeline();
  });

  afterEach(() => {
    TelemetryRuntime.reset();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("emit", () => {
    it("info() emits log with INFO severity and body", () => {
      // Act
      TelemetryLogger.info("hello", {}, "my-logger");

      // Assert
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
      // Act
      TelemetryLogger.debug("debug msg", { key: "value" });

      // Assert
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityText: LogSeverity.Debug,
          body: "debug msg",
          attributes: expect.objectContaining({ key: "value" }),
        }),
      );
    });

    it("warn() emits with WARN severity", () => {
      // Act
      TelemetryLogger.warn("warning", { code: 1 });

      // Assert
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityText: LogSeverity.Warning,
          body: "warning",
          attributes: expect.objectContaining({ code: 1 }),
        }),
      );
    });

    it("uses the Hub service name when no logger name is given", () => {
      // Act
      TelemetryLogger.info("hello");

      // Assert
      expect(mockGetLogger).toHaveBeenCalledWith("endatix-hub");
    });

    it("redacts credential-like attributes but keeps boolean diagnostics", () => {
      // Act
      TelemetryLogger.info(
        "Invite accepted",
        {
          authorization: "Bearer secret-token",
          hasToken: true,
          formId: "form-1",
        },
        "forms",
      );

      // Assert
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.objectContaining({
            authorization: "[REDACTED]",
            hasToken: true,
            formId: "form-1",
          }),
        }),
      );
    });
  });

  describe("error and critical", () => {
    it("error() without Error emits message and ERROR severity", () => {
      // Act
      TelemetryLogger.error(
        "something failed",
        undefined,
        { id: 42 },
        "err-logger",
      );

      // Assert
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityText: LogSeverity.Error,
          body: "something failed",
          attributes: expect.objectContaining({ id: 42 }),
        }),
      );
    });

    it("error() with Error sets exception attributes and combined body", () => {
      // Arrange
      const err = new Error("boom");
      err.stack = "Error: boom\n  at file.ts:1:1";

      // Act
      TelemetryLogger.error("Request failed", err, {}, "api");

      // Assert
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

    it.each([
      ["a string", "oops", "oops"],
      ["null", null, "null"],
      [
        "a plain object",
        { code: 500, detail: "Server error" },
        '{"code":500,"detail":"Server error"}',
      ],
      ["an object with a message", { code: "E_API", message: "boom" }, "boom"],
    ])(
      "error() describes %s instead of [object Object]",
      (_label, payload, text) => {
        // Act
        TelemetryLogger.error("Failed", payload, {}, "api");

        // Assert
        expect(mockEmit).toHaveBeenCalledWith(
          expect.objectContaining({
            severityText: LogSeverity.Error,
            body: `Failed: ${text}`,
            attributes: expect.objectContaining({
              "exception.type": "Error",
              "exception.message": text,
            }),
          }),
        );
      },
    );

    it("critical() with Error sets exception attributes and combined body", () => {
      // Arrange
      const err = new Error("fatal");

      // Act
      TelemetryLogger.critical("Unrecoverable", err, { service: "auth" });

      // Assert
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
      // Act
      TelemetryLogger.critical("System down");

      // Assert
      expect(mockEmit).toHaveBeenCalledWith(
        expect.objectContaining({
          severityText: LogSeverity.Critical,
          body: "System down",
        }),
      );
    });

    it("critical() with a non-Error normalizes it and sets exception attributes", () => {
      // Act
      TelemetryLogger.critical("Crash", "timeout", {}, "core");

      // Assert
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
  });

  describe("console output", () => {
    it("stays quiet while a log pipeline is running", () => {
      // Arrange
      vi.stubEnv("NODE_ENV", "development");
      const consoleInfo = silenceConsole("info");

      // Act
      TelemetryLogger.info("Form deleted", { formId: "form-1" }, "forms");

      // Assert
      expect(consoleInfo).not.toHaveBeenCalled();
    });

    it("prints in development when no exporter is configured", () => {
      // Arrange
      useNoExporter();
      vi.stubEnv("NODE_ENV", "development");
      const consoleError = silenceConsole("error");

      // Act
      TelemetryLogger.error(
        "Request failed",
        undefined,
        { formId: "form-1" },
        "forms",
      );

      // Assert
      expect(consoleError).toHaveBeenCalledWith("[forms] Request failed", {
        severity: LogSeverity.Error,
        attributes: expect.objectContaining({
          "log.type": "LogRecord",
          formId: "form-1",
        }),
      });
    });

    it("redacts sensitive attributes on the console", () => {
      // Arrange
      useNoExporter();
      vi.stubEnv("NODE_ENV", "development");
      const consoleError = silenceConsole("error");

      // Act
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

      // Assert
      expect(consoleError).toHaveBeenCalledWith("[forms] Request failed", {
        severity: LogSeverity.Error,
        attributes: expect.objectContaining({
          authorization: "[REDACTED]",
          connectionString: "[REDACTED]",
          formId: "form-1",
        }),
      });
    });

    it("prints in development when only OTLP traces are configured", () => {
      // Arrange
      useNoExporter();
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv(
        "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
        "http://localhost:4318/v1/traces",
      );
      const consoleInfo = silenceConsole("info");

      // Act
      TelemetryLogger.info("still visible", { formId: "form-1" }, "forms");

      // Assert
      expect(consoleInfo).toHaveBeenCalledWith(
        "[forms] still visible",
        expect.objectContaining({ severity: LogSeverity.Info }),
      );
    });

    it("prints in production when log export is configured but did not start", () => {
      // Arrange — e.g. a malformed connection string made every exporter throw.
      TelemetryRuntime.markLogPipelineActive(false);
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv(
        "APPLICATIONINSIGHTS_CONNECTION_STRING",
        "InstrumentationKey=broken",
      );
      const consoleInfo = silenceConsole("info");

      // Act
      TelemetryLogger.info("still visible", { formId: "form-1" }, "forms");

      // Assert
      expect(consoleInfo).toHaveBeenCalledWith(
        "[forms] still visible",
        expect.objectContaining({ severity: LogSeverity.Info }),
      );
    });

    it.each(["production", "test"])(
      "stays quiet in %s by default when no exporter is configured",
      (nodeEnv) => {
        // Arrange
        useNoExporter();
        vi.stubEnv("NODE_ENV", nodeEnv);
        const consoleError = silenceConsole("error");

        // Act
        TelemetryLogger.error("Request failed", undefined, {}, "forms");

        // Assert
        expect(consoleError).not.toHaveBeenCalled();
      },
    );

    it("prints in production when TELEMETRY_CONSOLE_FALLBACK is true", () => {
      // Arrange
      useNoExporter();
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");
      const consoleWarn = silenceConsole("warn");

      // Act
      TelemetryLogger.warn("Using fallback path", { path: "forms" }, "forms");

      // Assert
      expect(consoleWarn).toHaveBeenCalledWith("[forms] Using fallback path", {
        severity: LogSeverity.Warning,
        attributes: expect.objectContaining({ path: "forms" }),
      });
    });

    it("prints when OTEL_SDK_DISABLED leaves the exporter unused and fallback is on", () => {
      // Arrange
      TelemetryRuntime.markLogPipelineActive(false);
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("OTEL_SDK_DISABLED", "true");
      vi.stubEnv("TELEMETRY_CONSOLE_FALLBACK", "true");
      const consoleInfo = silenceConsole("info");

      // Act
      TelemetryLogger.info("still visible", {}, "forms");

      // Assert
      expect(consoleInfo).toHaveBeenCalledWith(
        "[forms] still visible",
        expect.objectContaining({ severity: LogSeverity.Info }),
      );
    });

    it("prints a record whose emit threw, and does not rethrow", () => {
      // Arrange
      vi.stubEnv("NODE_ENV", "production");
      mockEmit.mockImplementationOnce(() => {
        throw new Error("emit failed");
      });
      const consoleInfo = silenceConsole("info");

      // Act
      const act = () => TelemetryLogger.info("hello", {}, "forms");

      // Assert
      expect(act).not.toThrow();
      expect(consoleInfo).toHaveBeenCalledWith(
        "[forms] hello",
        expect.anything(),
      );
    });
  });
});
