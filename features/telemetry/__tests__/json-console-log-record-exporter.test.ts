import { describe, expect, it, vi } from "vitest";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableLogRecord } from "@opentelemetry/sdk-logs";
import {
  JsonConsoleLogRecordExporter,
  toJsonLine,
} from "../infrastructure/json-console-log-record-exporter";

function logRecord(
  overrides: Partial<ReadableLogRecord> = {},
): ReadableLogRecord {
  return {
    hrTime: [1_700_000_000, 0],
    hrTimeObserved: [1_700_000_000, 0],
    severityText: "WARNING",
    severityNumber: SeverityNumber.WARN,
    body: "PDF render exceeded the deadline.",
    attributes: { "pdf.timeoutMs": 45000 },
    droppedAttributesCount: 0,
    instrumentationScope: { name: "pdf-export" },
    spanContext: {
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
      traceFlags: 1,
    },
    ...overrides,
  } as ReadableLogRecord;
}

describe("JsonConsoleLogRecordExporter", () => {
  it("writes one JSON object per line per record", async () => {
    // Arrange
    const writeLine = vi.fn();
    const callback = vi.fn();

    // Act
    new JsonConsoleLogRecordExporter(writeLine).export(
      [logRecord(), logRecord()],
      callback,
    );
    await vi.waitFor(() => expect(callback).toHaveBeenCalled());

    // Assert
    expect(writeLine).toHaveBeenCalledTimes(2);
    const line = String(writeLine.mock.calls[0][0]);
    expect(line.endsWith("\n")).toBe(true);
    expect(line.trimEnd()).not.toContain("\n");
    expect(JSON.parse(line)).toEqual({
      timestamp: "2023-11-14T22:13:20.000000000Z",
      severity: "WARNING",
      severityNumber: SeverityNumber.WARN,
      logger: "pdf-export",
      body: "PDF render exceeded the deadline.",
      traceId: "a".repeat(32),
      spanId: "b".repeat(16),
      attributes: { "pdf.timeoutMs": 45000 },
    });
    expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
  });

  it("fails the export instead of throwing when stdout cannot be written", async () => {
    // Arrange
    const writeLine = vi.fn(() => {
      throw new Error("EPIPE");
    });
    const callback = vi.fn();

    // Act
    const act = () =>
      new JsonConsoleLogRecordExporter(writeLine).export(
        [logRecord()],
        callback,
      );

    // Assert
    expect(act).not.toThrow();
    await vi.waitFor(() =>
      expect(callback).toHaveBeenCalledWith({
        code: ExportResultCode.FAILED,
        error: expect.objectContaining({ message: "EPIPE" }),
      }),
    );
  });

  it("forceFlush waits for a write whose callback is still pending", async () => {
    let finishWrite: (() => void) | undefined;
    const writeLine = () =>
      new Promise<void>((resolve) => {
        finishWrite = resolve;
      });
    const exporter = new JsonConsoleLogRecordExporter(writeLine);
    const callback = vi.fn();

    exporter.export([logRecord()], callback);
    const flushed = exporter.forceFlush();
    let flushDone = false;
    void flushed.then(() => {
      flushDone = true;
    });
    await Promise.resolve();
    expect(flushDone).toBe(false);
    expect(callback).not.toHaveBeenCalled();

    finishWrite?.();
    await flushed;

    expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
  });

  it("resolves flush and shutdown when nothing is pending", async () => {
    const exporter = new JsonConsoleLogRecordExporter(vi.fn());

    await expect(exporter.forceFlush()).resolves.toBeUndefined();
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});

describe("toJsonLine", () => {
  it("redacts credential-like attributes", () => {
    const line = toJsonLine(
      logRecord({
        attributes: { authorization: "Bearer secret", formId: "form-1" },
      }),
    );

    expect(JSON.parse(line).attributes).toEqual({
      authorization: "[REDACTED]",
      formId: "form-1",
    });
    expect(line).not.toContain("Bearer secret");
  });

  it("still produces a line when a value cannot be serialized", () => {
    const line = toJsonLine(
      logRecord({ attributes: { big: BigInt(1) as unknown as number } }),
    );

    expect(JSON.parse(line)).toMatchObject({
      logger: "pdf-export",
      body: "PDF render exceeded the deadline.",
    });
    expect(JSON.parse(line).attributes).toBeUndefined();
  });

  it("omits trace fields for a record outside a span", () => {
    const parsed = JSON.parse(
      toJsonLine(logRecord({ spanContext: undefined })),
    );

    expect(parsed.traceId).toBeUndefined();
    expect(parsed.spanId).toBeUndefined();
  });
});
