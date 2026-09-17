import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { stringifyUnknown } from "@/lib/utils/string-utils";
import { TelemetryConfig } from "./telemetry-config";
import { TelemetryRuntime } from "./telemetry-runtime";
import { redactSensitiveAttributes } from "./redact-sensitive-attributes";

export enum LogSeverity {
  Debug = "DEBUG",
  Info = "INFO",
  Warning = "WARNING",
  Error = "ERROR",
  Critical = "CRITICAL",
}

const severityMap: Record<LogSeverity, SeverityNumber> = {
  [LogSeverity.Debug]: SeverityNumber.DEBUG,
  [LogSeverity.Info]: SeverityNumber.INFO,
  [LogSeverity.Warning]: SeverityNumber.WARN,
  [LogSeverity.Error]: SeverityNumber.ERROR,
  [LogSeverity.Critical]: SeverityNumber.FATAL,
};

const consoleMethodMap: Record<
  LogSeverity,
  "debug" | "info" | "warn" | "error"
> = {
  [LogSeverity.Debug]: "debug",
  [LogSeverity.Info]: "info",
  [LogSeverity.Warning]: "warn",
  [LogSeverity.Error]: "error",
  [LogSeverity.Critical]: "error",
};

export interface LogAttributes {
  [key: string]: string | number | boolean | undefined;
}

export function parseErrorMessage(value: unknown): string {
  return stringifyUnknown(value, { preferKey: "message" });
}

export class TelemetryLogger {
  private static readonly DEFAULT_LOGGER_NAME = TelemetryConfig.SERVICE_NAME;

  static log(
    message: string,
    severity: LogSeverity = LogSeverity.Info,
    attributes: LogAttributes = {},
    loggerName?: string,
  ): void {
    const name = loggerName ?? this.DEFAULT_LOGGER_NAME;
    const safeAttributes = redactSensitiveAttributes({
      "log.type": "LogRecord",
      ...attributes,
    });

    let emitFailed = false;
    try {
      logs.getLogger(name).emit({
        severityNumber: severityMap[severity],
        severityText: severity,
        body: message,
        attributes: safeAttributes,
      });
    } catch {
      emitFailed = true;
    }

    if (emitFailed || shouldPrintFormattedConsole()) {
      const method = consoleMethodMap[severity];
      console[method](`[${name}] ${message}`, {
        severity,
        attributes: safeAttributes,
      });
    }
  }

  static debug(
    message: string,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.log(message, LogSeverity.Debug, attributes, loggerName);
  }

  static info(
    message: string,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.log(message, LogSeverity.Info, attributes, loggerName);
  }

  static warn(
    message: string,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.log(message, LogSeverity.Warning, attributes, loggerName);
  }

  static error(
    message: string,
    error?: unknown,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.logFailure(LogSeverity.Error, message, error, attributes, loggerName);
  }

  static critical(
    message: string,
    error?: unknown,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.logFailure(
      LogSeverity.Critical,
      message,
      error,
      attributes,
      loggerName,
    );
  }

  private static logFailure(
    severity: LogSeverity.Error | LogSeverity.Critical,
    message: string,
    error: unknown,
    attributes: LogAttributes = {},
    loggerName?: string,
  ): void {
    if (error === undefined) {
      this.log(message, severity, attributes, loggerName);
      return;
    }

    const err =
      error instanceof Error ? error : new Error(parseErrorMessage(error));
    this.log(
      `${message}: ${err.message}`,
      severity,
      {
        ...attributes,
        "exception.type": err.name,
        "exception.message": err.message,
        "exception.stacktrace": err.stack ?? "",
      },
      loggerName,
    );
  }
}

/**
 * Console output is for records that would otherwise go nowhere, and for local
 * development. A running log pipeline (exporter or JSON stdout) owns output. When
 * none runs, print if log export was configured (it failed to start, or has not
 * started yet), if `TELEMETRY_CONSOLE_FALLBACK=true`, or in development.
 */
function shouldPrintFormattedConsole(): boolean {
  if (TelemetryRuntime.isLogPipelineActive()) {
    return false;
  }
  return (
    TelemetryConfig.hasActiveLogExporter() ||
    TelemetryConfig.consoleFallbackEnabled() ||
    process.env.NODE_ENV === "development"
  );
}
