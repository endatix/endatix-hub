import { pdf } from "@react-pdf/renderer";
import { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { TelemetryLogger, TelemetryTracer } from "@/features/telemetry";
import {
  isPdfRenderTimeout,
  PDF_RENDER_TIMEOUT_CODE,
  raceWithTimeout,
  remainingRenderTimeoutMs,
  renderTimeoutMs,
} from "../render-timeout";
import { describePdfWorkload } from "./describe-pdf-workload";
import { preparePdfModel } from "./prepare-pdf-model.use-case";
import { SubmissionDetailsPdf } from "./submission-details-pdf";

const TRACER = "pdf-export";
const LOGGER_NAME = "pdf-export";
const PDF_DEADLINE_EXCEEDED = "PDF render exceeded the deadline.";
const PDF_EXPORT_FAILED = "PDF export failed.";

/** Which entry point asked for the PDF; the two have different size profiles. */
type PdfExportCaller = "anonymous-token" | "hub-authenticated";

interface RenderSubmissionPdfOptions {
  submission: Submission;
  customQuestionsJsonData: string[];
  useDefaultLocale?: boolean;
  /**
   * When the request began. The deadline is measured from here, not from the
   * start of the render, so time already spent loading the submission is not
   * handed to the renderer a second time.
   */
  startedAtMs: number;
  caller: PdfExportCaller;
}

/**
 * Builds the survey model and renders it to a PDF, bounded by the render deadline.
 *
 * Both export routes - the anonymous token link and the Hub API - go through
 * here, so the model preparation, the renderer and the deadline live in exactly
 * one place. That is also what makes swapping the rendering engine a change to
 * this file rather than a change to every caller.
 *
 * Exceeding the deadline is an expected outcome, not an exception, so it comes
 * back as `Result.error` carrying `PDF_RENDER_TIMEOUT_CODE`; callers decide how
 * to present it. Other faults also return `Result.error` with a generic message.
 *
 * Two spans are emitted - `prepare-model` and `render-pdf`. The render span
 * carries a pre-render description of the workload so a slow render can be
 * correlated against what made it slow, which is the evidence needed before
 * choosing any sync-vs-async threshold.
 */
export async function renderSubmissionPdf({
  submission,
  customQuestionsJsonData,
  useDefaultLocale,
  startedAtMs,
  caller,
}: RenderSubmissionPdfOptions): Promise<Result<Blob>> {
  try {
    const surveyModel = await TelemetryTracer.traceAsync(
      TRACER,
      "prepare-model",
      async (span) => {
        span.setAttribute("pdf.caller", caller);
        try {
          return await raceWithTimeout(
            () =>
              preparePdfModel({
                submission,
                customQuestionsJsonData,
                useDefaultLocale,
              }),
            remainingRenderTimeoutMs(startedAtMs),
          );
        } catch (error) {
          if (isPdfRenderTimeout(error)) {
            span.setAttributes({ "pdf.outcome": "timeout" });
            return undefined;
          }
          throw error;
        }
      },
    );

    if (!surveyModel) {
      return deadlineExceeded(caller);
    }

    return await TelemetryTracer.traceAsync(
      TRACER,
      "render-pdf",
      async (span) => {
        const workload = describePdfWorkload(surveyModel);

        span.setAttributes({
          "pdf.caller": caller,
          "pdf.questionCount": workload.questionCount,
          "pdf.answeredCount": workload.answeredCount,
          "pdf.fileAttachmentCount": workload.fileAttachmentCount,
          "pdf.matrixRowCount": workload.matrixRowCount,
          "pdf.timeoutMs": renderTimeoutMs(),
        });

        const renderStartedAtMs = Date.now();

        try {
          const pdfBlob = await raceWithTimeout(
            () =>
              pdf(
                <SubmissionDetailsPdf
                  submission={submission}
                  surveyModel={surveyModel}
                />,
              ).toBlob(),
            remainingRenderTimeoutMs(startedAtMs),
          );

          span.setAttributes({
            "pdf.outcome": "success",
            "pdf.durationMs": Date.now() - renderStartedAtMs,
            "pdf.byteSize": pdfBlob.size,
          });

          return Result.success(pdfBlob);
        } catch (error) {
          const durationMs = Date.now() - renderStartedAtMs;

          if (isPdfRenderTimeout(error)) {
            span.setAttributes({
              "pdf.outcome": "timeout",
              "pdf.durationMs": durationMs,
            });
            return deadlineExceeded(caller, { "pdf.durationMs": durationMs });
          }

          span.setAttributes({
            "pdf.outcome": "error",
            "pdf.durationMs": durationMs,
          });

          throw error;
        }
      },
    );
  } catch (error) {
    if (isPdfRenderTimeout(error)) {
      return deadlineExceeded(caller);
    }

    // Safe scalars only: renderer errors can quote image URLs that carry SAS
    // tokens. TelemetryTracer redacts those query params on the span exception.
    TelemetryLogger.error(
      PDF_EXPORT_FAILED,
      undefined,
      {
        "pdf.caller": caller,
        "error.type": error instanceof Error ? error.name : typeof error,
      },
      LOGGER_NAME,
    );
    return Result.error(PDF_EXPORT_FAILED);
  }
}

/**
 * Logs the overrun as a warning (an expected outcome, not an exception) and
 * returns the timeout Result callers map to their own response.
 */
function deadlineExceeded(
  caller: PdfExportCaller,
  attributes: { "pdf.durationMs"?: number } = {},
): Result<Blob> {
  TelemetryLogger.warn(
    PDF_DEADLINE_EXCEEDED,
    {
      "pdf.caller": caller,
      "pdf.timeoutMs": renderTimeoutMs(),
      ...attributes,
    },
    LOGGER_NAME,
  );

  return Result.error(
    PDF_DEADLINE_EXCEEDED,
    undefined,
    PDF_RENDER_TIMEOUT_CODE,
  );
}
