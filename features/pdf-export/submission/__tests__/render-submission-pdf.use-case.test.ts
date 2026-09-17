import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model } from "survey-core";
import { Result } from "@/lib/result";

/** Captures what each span was told, so the telemetry contract can be asserted. */
const spans: {
  name: string;
  attributes: Record<string, unknown>;
  recordException: ReturnType<typeof vi.fn>;
  setStatus: ReturnType<typeof vi.fn>;
}[] = [];

vi.mock("@/features/telemetry", () => ({
  TelemetryTracer: {
    traceAsync: async (
      _tracer: string,
      name: string,
      fn: (span: unknown) => Promise<unknown>,
    ) => {
      const record = {
        name,
        attributes: {} as Record<string, unknown>,
        recordException: vi.fn(),
        setStatus: vi.fn(),
      };
      spans.push(record);
      const span = {
        setAttribute: (key: string, value: unknown) => {
          record.attributes[key] = value;
        },
        setAttributes: (values: Record<string, unknown>) => {
          Object.assign(record.attributes, values);
        },
        recordException: record.recordException,
        setStatus: record.setStatus,
      };
      return fn(span);
    },
  },
  TelemetryLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const surveyModel = new Model({
  elements: [{ type: "text", name: "q1" }],
});
surveyModel.data = { q1: "answered" };

vi.mock("../prepare-pdf-model.use-case", () => ({
  preparePdfModel: vi.fn(async () => surveyModel),
}));

const toBlob = vi.fn(async () => new Blob(["%PDF-1.4"]));
vi.mock("@react-pdf/renderer", () => ({
  pdf: () => ({ toBlob }),
  Document: () => null,
  Page: () => null,
  View: () => null,
  Text: () => null,
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: vi.fn() },
  Svg: () => null,
  Path: () => null,
}));

vi.mock("../submission-details-pdf", () => ({
  SubmissionDetailsPdf: () => null,
}));

const { renderSubmissionPdf } =
  await import("../render-submission-pdf.use-case");
const { preparePdfModel } = await import("../prepare-pdf-model.use-case");
const { TelemetryLogger } = await import("@/features/telemetry");

const submission = { id: "s1" } as never;

beforeEach(() => {
  spans.length = 0;
  toBlob.mockClear();
  vi.mocked(preparePdfModel).mockClear();
  vi.mocked(preparePdfModel).mockResolvedValue(surveyModel);
  vi.mocked(TelemetryLogger.warn).mockClear();
  vi.mocked(TelemetryLogger.error).mockClear();
  vi.useRealTimers();
});

describe("renderSubmissionPdf", () => {
  it("emits a prepare-model and a render-pdf span", async () => {
    // Act
    await renderSubmissionPdf({
      submission,
      customQuestionsJsonData: [],
      startedAtMs: Date.now(),
      caller: "hub-authenticated",
    });

    // Assert
    expect(spans.map((s) => s.name)).toEqual(["prepare-model", "render-pdf"]);
  });

  it("records the workload and a success outcome", async () => {
    // Act
    const result = await renderSubmissionPdf({
      submission,
      customQuestionsJsonData: [],
      startedAtMs: Date.now(),
      caller: "anonymous-token",
    });

    // Assert
    expect(Result.isSuccess(result)).toBe(true);

    const render = spans.find((s) => s.name === "render-pdf");
    expect(render?.attributes).toMatchObject({
      "pdf.caller": "anonymous-token",
      "pdf.outcome": "success",
      "pdf.questionCount": 1,
      "pdf.answeredCount": 1,
      "pdf.matrixRowCount": 0,
      "pdf.fileAttachmentCount": 0,
    });
    expect(render?.attributes["pdf.durationMs"]).toBeTypeOf("number");
  });

  /**
   * A deadline overrun is a measured outcome, not a fault: it must come back as
   * a Result and be distinguishable from an exception in telemetry.
   */
  it("reports a timeout as an outcome, not an exception", async () => {
    // Arrange - no budget left, so the race expires immediately
    const result = await renderSubmissionPdf({
      submission,
      customQuestionsJsonData: [],
      startedAtMs: Date.now() - 10_000_000,
      caller: "hub-authenticated",
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorCode).toBe("pdf_render_timeout");
    }

    const render = spans.find((s) => s.name === "render-pdf");
    expect(render).toBeUndefined();
    expect(preparePdfModel).not.toHaveBeenCalled();
    expect(toBlob).not.toHaveBeenCalled();
    expect(TelemetryLogger.warn).toHaveBeenCalledWith(
      "PDF render exceeded the deadline.",
      expect.objectContaining({
        "pdf.caller": "hub-authenticated",
        "pdf.timeoutMs": expect.any(Number),
      }),
      "pdf-export",
    );
  });

  it("times out when model preparation never finishes", async () => {
    // Arrange
    vi.useFakeTimers();
    vi.mocked(preparePdfModel).mockImplementation(
      () => new Promise(() => undefined),
    );

    // Act
    const pending = renderSubmissionPdf({
      submission,
      customQuestionsJsonData: [],
      startedAtMs: Date.now(),
      caller: "anonymous-token",
    });
    await vi.advanceTimersByTimeAsync(40_000);
    const result = await pending;

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorCode).toBe("pdf_render_timeout");
    }
    expect(TelemetryLogger.warn).toHaveBeenCalledWith(
      "PDF render exceeded the deadline.",
      expect.objectContaining({ "pdf.caller": "anonymous-token" }),
      "pdf-export",
    );
    expect(TelemetryLogger.error).not.toHaveBeenCalled();
    const prepare = spans.find((s) => s.name === "prepare-model");
    expect(prepare?.attributes["pdf.outcome"]).toBe("timeout");
    expect(prepare?.recordException).not.toHaveBeenCalled();
    expect(prepare?.setStatus).not.toHaveBeenCalled();
  });

  it("logs the render duration when the renderer itself overruns", async () => {
    // Arrange
    vi.useFakeTimers();
    toBlob.mockImplementationOnce(() => new Promise(() => undefined));

    // Act
    const pending = renderSubmissionPdf({
      submission,
      customQuestionsJsonData: [],
      startedAtMs: Date.now(),
      caller: "hub-authenticated",
    });
    await vi.advanceTimersByTimeAsync(40_000);
    const result = await pending;

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorCode).toBe("pdf_render_timeout");
    }
    expect(TelemetryLogger.warn).toHaveBeenCalledTimes(1);
    expect(TelemetryLogger.warn).toHaveBeenCalledWith(
      "PDF render exceeded the deadline.",
      expect.objectContaining({
        "pdf.caller": "hub-authenticated",
        "pdf.durationMs": expect.any(Number),
      }),
      "pdf-export",
    );
  });

  it("returns a generic failure when render throws", async () => {
    // Arrange
    toBlob.mockRejectedValueOnce(new Error("renderer exploded"));

    // Act
    const result = await renderSubmissionPdf({
      submission,
      customQuestionsJsonData: [],
      startedAtMs: Date.now(),
      caller: "hub-authenticated",
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("PDF export failed.");
    }
    expect(TelemetryLogger.error).toHaveBeenCalledWith(
      "PDF export failed.",
      undefined,
      { "pdf.caller": "hub-authenticated", "error.type": "Error" },
      "pdf-export",
    );
    expect(TelemetryLogger.warn).not.toHaveBeenCalled();
  });
});
