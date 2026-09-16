import { pdf } from "@react-pdf/renderer";
import { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { TelemetryTracer } from "@/features/telemetry";
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
 * to present it. Anything else genuinely is a fault and still throws.
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
  const surveyModel = await TelemetryTracer.traceAsync(
    TRACER,
    "prepare-model",
    async (span) => {
      span.setAttribute("pdf.caller", caller);
      return preparePdfModel({
        submission,
        customQuestionsJsonData,
        useDefaultLocale,
      });
    },
  );

  return TelemetryTracer.traceAsync(TRACER, "render-pdf", async (span) => {
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
        // A timeout is a measured outcome, not a fault - record it and return.
        span.setAttributes({
          "pdf.outcome": "timeout",
          "pdf.durationMs": durationMs,
        });

        return Result.error(
          "PDF render exceeded the deadline.",
          undefined,
          PDF_RENDER_TIMEOUT_CODE,
        );
      }

      // traceAsync records the exception and sets the span status; this only
      // adds the attributes a query needs to tell faults from timeouts.
      span.setAttributes({
        "pdf.outcome": "error",
        "pdf.durationMs": durationMs,
      });

      throw error;
    }
  });
}
