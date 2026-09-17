import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { TelemetryConfig } from "./telemetry-config";
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
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("message" in obj) return String(obj.message);
    try {
      return JSON.stringify(value);
    } catch {
      return "[Circular]";
    }
  }

  return typeof value === "bigint" ||
    typeof value === "symbol" ||
    typeof value === "function"
    ? value.toString()
    : String(value);
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

function shouldPrintFormattedConsole(): boolean {
  if (TelemetryConfig.hasActiveLogExporter()) {
    return false;
  }
  if (
    TelemetryConfig.hasActiveExporter() &&
    TelemetryConfig.consoleFallbackEnabled()
  ) {
    return false;
  }
  return (
    process.env.NODE_ENV === "development" ||
    TelemetryConfig.consoleFallbackEnabled()
  );
}
