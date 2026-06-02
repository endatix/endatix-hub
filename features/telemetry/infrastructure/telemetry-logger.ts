import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { TelemetryConfig } from "./telemetry-config";

/**
 * Severity levels for logging
 */
export enum LogSeverity {
  /**
   * Detailed debug information
   */
  Debug = "DEBUG",

  /**
   * Interesting events
   */
  Info = "INFO",

  /**
   * Unexpected warnings
   */
  Warning = "WARNING",

  /**
   * Error events that might still allow the application to continue running
   */
  Error = "ERROR",

  /**
   * Critical conditions
   */
  Critical = "CRITICAL",
}

/**
 * Maps LogSeverity enum to OpenTelemetry SeverityNumber
 */
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

const sensitiveAttributePattern =
  /(authorization|cookie|token|secret|password|api[-_ ]?key|connection[-_ ]?string)/i;

/**
 * Log record attributes
 */
export interface LogAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Converts an unknown value to a string suitable for an Error message.
 * Avoids "[object Object]" for plain objects by using JSON.stringify or .message when present.
 */
export function parseErrorMessage(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if ("message" in obj) return String(obj.message);
    try {
      return JSON.stringify(value);
    } catch {
      return "[Circular]";
    }
  }

  const shouldUseToString =
    typeof value === "bigint" ||
    typeof value === "symbol" ||
    typeof value === "function";

  // Use value.toString() for bigint, symbol, and function to avoid double-escaping
  return shouldUseToString ? value.toString() : String(value);
}

/**
 * Provides utilities for logging with OpenTelemetry
 */
export class TelemetryLogger {
  private static readonly DEFAULT_LOGGER_NAME = "default";

  /**
   * Gets a logger with the given name
   * @param name Logger name
   */
  static getLogger(name: string = this.DEFAULT_LOGGER_NAME) {
    return logs.getLogger(name);
  }

  /**
   * Logs a message with the specified severity
   * @param message Message to log
   * @param severity Severity level
   * @param attributes Additional attributes to include
   * @param loggerName Name of the logger
   */
  static log(
    message: string,
    severity: LogSeverity = LogSeverity.Info,
    attributes: LogAttributes = {},
    loggerName?: string,
  ): void {
    const logger = this.getLogger(loggerName);

    // Add standard attributes
    const enhancedAttributes = {
      "log.type": "LogRecord",
      ...attributes,
    };

    let emitFailed = false;
    try {
      logger.emit({
        severityNumber: severityMap[severity],
        severityText: severity,
        body: message,
        attributes: enhancedAttributes,
      });
    } catch {
      emitFailed = true;
      // Logging must never interrupt application flow. Console fallback below
      // still makes local diagnostics visible when enabled.
    }

    this.logToConsoleFallback(
      message,
      severity,
      enhancedAttributes,
      loggerName ?? this.DEFAULT_LOGGER_NAME,
      emitFailed,
    );
  }

  private static logToConsoleFallback(
    message: string,
    severity: LogSeverity,
    attributes: LogAttributes,
    loggerName: string,
    force = false,
  ): void {
    if (!force && !this.shouldUseConsoleFallback()) {
      return;
    }

    const consoleMethod = consoleMethodMap[severity];
    console[consoleMethod](`[${loggerName}] ${message}`, {
      severity,
      attributes: sanitizeConsoleAttributes(attributes),
    });
  }

  private static shouldUseConsoleFallback(): boolean {
    const hasTelemetryExporter =
      TelemetryConfig.isAzureConfigured() || TelemetryConfig.isOtelConfigured();

    if (hasTelemetryExporter) {
      return false;
    }

    return (
      process.env.NODE_ENV === "development" ||
      process.env.TELEMETRY_CONSOLE_FALLBACK === "true"
    );
  }

  /**
   * Logs a debug message
   * @param message Message to log
   * @param attributes Additional attributes
   * @param loggerName Logger name
   */
  static debug(
    message: string,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.log(message, LogSeverity.Debug, attributes, loggerName);
  }

  /**
   * Logs an info message
   * @param message Message to log
   * @param attributes Additional attributes
   * @param loggerName Logger name
   */
  static info(
    message: string,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.log(message, LogSeverity.Info, attributes, loggerName);
  }

  /**
   * Logs a warning message
   * @param message Message to log
   * @param attributes Additional attributes
   * @param loggerName Logger name
   */
  static warn(
    message: string,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    this.log(message, LogSeverity.Warning, attributes, loggerName);
  }

  /**
   * Logs an error message
   * @param message Message to log
   * @param error Optional error object
   * @param attributes Additional attributes
   * @param loggerName Logger name
   */
  static error(
    message: string,
    error?: unknown,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    const enhancedAttributes: LogAttributes = {
      ...attributes,
    };

    if (error) {
      const err =
        error instanceof Error ? error : new Error(parseErrorMessage(error));
      // OTEL semantic convention – Azure maps these to Failures; body includes context so it appears in exception view
      enhancedAttributes["exception.type"] = err.name;
      enhancedAttributes["exception.message"] = err.message;
      enhancedAttributes["exception.stacktrace"] = err.stack ?? "";
      this.log(
        `${message}: ${err.message}`,
        LogSeverity.Error,
        enhancedAttributes,
        loggerName,
      );
    } else {
      this.log(message, LogSeverity.Error, enhancedAttributes, loggerName);
    }
  }

  /**
   * Logs a critical message
   * @param message Message to log
   * @param error Optional error object
   * @param attributes Additional attributes
   * @param loggerName Logger name
   */
  static critical(
    message: string,
    error?: unknown,
    attributes?: LogAttributes,
    loggerName?: string,
  ): void {
    const enhancedAttributes: LogAttributes = {
      ...attributes,
    };

    if (error) {
      const err =
        error instanceof Error ? error : new Error(parseErrorMessage(error));
      enhancedAttributes["exception.type"] = err.name;
      enhancedAttributes["exception.message"] = err.message;
      enhancedAttributes["exception.stacktrace"] = err.stack ?? "";
      this.log(
        `${message}: ${err.message}`,
        LogSeverity.Critical,
        enhancedAttributes,
        loggerName,
      );
    } else {
      this.log(message, LogSeverity.Critical, enhancedAttributes, loggerName);
    }
  }
}

function sanitizeConsoleAttributes(attributes: LogAttributes): LogAttributes {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      sensitiveAttributePattern.test(key) ? "[REDACTED]" : value,
    ]),
  );
}
