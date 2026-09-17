import {
  ExportResultCode,
  hrTimeToTimeStamp,
  type ExportResult,
} from "@opentelemetry/core";
import type {
  LogRecordExporter,
  ReadableLogRecord,
} from "@opentelemetry/sdk-logs";
import { redactSensitiveAttributes } from "./redact-sensitive-attributes";

type LineWriter = (line: string) => void | Promise<void>;

function writeToStdout(line: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(line, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function toExportError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Writes each log record to stdout as one JSON line.
 *
 * The SDK's ConsoleLogRecordExporter uses console.dir, which prints a multi-line
 * object dump; container log agents split that into one entry per line.
 */
export class JsonConsoleLogRecordExporter implements LogRecordExporter {
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly writeLine: LineWriter = writeToStdout) {}

  export(
    records: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    this.pending = this.pending
      .then(async () => {
        for (const record of records) {
          await this.writeLine(`${toJsonLine(record)}\n`);
        }
      })
      .then(
        () => {
          resultCallback({ code: ExportResultCode.SUCCESS });
        },
        (error: unknown) => {
          resultCallback({
            code: ExportResultCode.FAILED,
            error: toExportError(error),
          });
        },
      );
  }

  shutdown(): Promise<void> {
    return this.pending;
  }

  forceFlush(): Promise<void> {
    return this.pending;
  }
}

export function toJsonLine(record: ReadableLogRecord): string {
  const line = {
    timestamp: hrTimeToTimeStamp(record.hrTime),
    severity: record.severityText,
    severityNumber: record.severityNumber,
    logger: record.instrumentationScope.name,
    body: record.body,
    traceId: record.spanContext?.traceId,
    spanId: record.spanContext?.spanId,
    attributes: redactSensitiveAttributes(record.attributes),
  };

  try {
    return JSON.stringify(line);
  } catch {
    return JSON.stringify({
      ...line,
      body: String(record.body),
      attributes: undefined,
    });
  }
}
