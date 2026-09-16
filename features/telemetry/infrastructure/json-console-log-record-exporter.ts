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

type LineWriter = (line: string) => void;

const writeToStdout: LineWriter = (line) => {
  process.stdout.write(line);
};

/**
 * Writes each log record to stdout as one JSON line.
 *
 * The SDK's ConsoleLogRecordExporter uses console.dir, which prints a multi-line
 * object dump; container log agents (CloudWatch, Cloud Logging, Azure Container
 * Apps, kubectl pipelines) split that into one entry per line. One JSON object per
 * line survives every one of them and stays queryable. Credential-like attribute
 * keys are redacted, as in TelemetryLogger's console fallback.
 */
export class JsonConsoleLogRecordExporter implements LogRecordExporter {
  constructor(private readonly writeLine: LineWriter = writeToStdout) {}

  export(
    records: ReadableLogRecord[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    try {
      for (const record of records) {
        this.writeLine(`${toJsonLine(record)}\n`);
      }
      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      // A closed or broken stdout (EPIPE) must fail the export, not throw into
      // the log processor and from there into the code that emitted the record.
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
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
    // BigInt or circular values in body/attributes: keep the line, drop the payload.
    return JSON.stringify({
      ...line,
      body: String(record.body),
      attributes: undefined,
    });
  }
}
