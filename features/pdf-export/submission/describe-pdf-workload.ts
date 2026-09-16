import { Model, Question } from "survey-core";
import { shouldIncludeQuestionInPdf } from "../should-include-question-in-pdf";

/**
 * Cheap, pre-render description of how much work a PDF is going to be.
 *
 * Every field is derived from the prepared model without rendering anything, so
 * this can serve two purposes: telemetry attributes today, and - once the data
 * shows which signal predicts a slow render - the input to a sync-vs-async
 * routing decision. That decision *must* be made before rendering starts,
 * because `@react-pdf` cannot be aborted, so "render and see" is not available.
 */
export type PdfWorkload = {
  /** Questions that will actually be drawn, after the PDF's own filter. */
  questionCount: number;
  /** Of those, how many carry an answer. */
  answeredCount: number;
  /** Questions holding stored files, which also cost storage read tokens. */
  fileAttachmentCount: number;
  /** Total matrix rows across all matrix questions - the prime suspect. */
  matrixRowCount: number;
};

const FILE_QUESTION_TYPES = new Set(["file", "audiorecorder"]);

/** Matrix models expose rows under different names; read defensively. */
function countMatrixRows(question: Question): number {
  const candidate = question as Question & {
    visibleRows?: unknown;
    rows?: unknown;
  };

  const rows = Array.isArray(candidate.visibleRows)
    ? candidate.visibleRows
    : candidate.rows;

  return Array.isArray(rows) ? rows.length : 0;
}

export function describePdfWorkload(surveyModel: Model): PdfWorkload {
  const questions = surveyModel
    .getAllQuestions(false, false, false)
    .filter(shouldIncludeQuestionInPdf);

  let answeredCount = 0;
  let fileAttachmentCount = 0;
  let matrixRowCount = 0;

  for (const question of questions) {
    if (typeof question.isEmpty !== "function" || !question.isEmpty()) {
      answeredCount += 1;
    }

    const type = question.getType();

    if (FILE_QUESTION_TYPES.has(type)) {
      fileAttachmentCount += 1;
    }

    if (type.startsWith("matrix")) {
      matrixRowCount += countMatrixRows(question);
    }
  }

  return {
    questionCount: questions.length,
    answeredCount,
    fileAttachmentCount,
    matrixRowCount,
  };
}
