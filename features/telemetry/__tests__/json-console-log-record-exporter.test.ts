import { afterEach, describe, expect, it, vi } from "vitest";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { JsonConsoleLogRecordExporter } from "../infrastructure/json-console-log-record-exporter";

function record(overrides: Partial<ReadableLogRecord> = {}): ReadableLogRecord {
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one JSON object per line per record", () => {
    // Arrange
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const callback = vi.fn();

    // Act
    new JsonConsoleLogRecordExporter().export([record(), record()], callback);

    // Assert
    expect(write).toHaveBeenCalledTimes(2);
    const line = String(write.mock.calls[0][0]);
    expect(line.endsWith("\n")).toBe(true);
    expect(line.trimEnd()).not.toContain("\n");
    expect(JSON.parse(line)).toMatchObject({
      severity: "WARNING",
      logger: "pdf-export",
      body: "PDF render exceeded the deadline.",
      traceId: "a".repeat(32),
      attributes: { "pdf.timeoutMs": 45000 },
    });
    expect(callback).toHaveBeenCalledWith({ code: ExportResultCode.SUCCESS });
  });

  it("still writes a line when the body cannot be serialized", () => {
    // Arrange
    const write = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    // Act
    new JsonConsoleLogRecordExporter().export(
      [record({ attributes: { big: BigInt(1) as unknown as number } })],
      vi.fn(),
    );

    // Assert
    expect(JSON.parse(String(write.mock.calls[0][0]))).toMatchObject({
      logger: "pdf-export",
    });
  });
});
