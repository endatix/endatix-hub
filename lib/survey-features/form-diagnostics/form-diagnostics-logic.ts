import { JsonObject, type Question, type SurveyModel } from "survey-core";

export interface FormDiagnosticsStats {
  /** UTF-8 byte size of the serialized survey JSON. */
  uncompressedSize: number;
  totalQuestions: number;
  logicConditionsCount: number;
  invisibleLogicItemsCount: number;
  dropdownCount: number;
  totalDropdownChoicesCount: number;
  maxDropdownChoicesCount: number;
  /** Total size in characters of all "choices" props in the survey JSON (select-base questions + matrix columns). */
  totalChoicesJsonSize: number;
  /** Largest single "choices" blob size in the survey JSON. */
  maxChoicesJsonSize: number;
  fileUploadCount: number;
  fileUploadWithoutBlobCount: number;
  scanditCount: number;
}

const emptyStats = (): FormDiagnosticsStats => ({
  uncompressedSize: 0,
  totalQuestions: 0,
  logicConditionsCount: 0,
  invisibleLogicItemsCount: 0,
  dropdownCount: 0,
  totalDropdownChoicesCount: 0,
  maxDropdownChoicesCount: 0,
  totalChoicesJsonSize: 0,
  maxChoicesJsonSize: 0,
  fileUploadCount: 0,
  fileUploadWithoutBlobCount: 0,
  scanditCount: 0,
});

function getUtf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Question types that have a choices array with item text (select-base). */
const SELECT_BASE_TYPES = new Set([
  "dropdown",
  "radiogroup",
  "checkbox",
  "imagepicker",
  "ranking",
]);

type SurveyJsonRecord = Record<string, unknown>;

function asRecord(value: unknown): SurveyJsonRecord | null {
  return value && typeof value === "object"
    ? (value as SurveyJsonRecord)
    : null;
}

function getChoiceCount(source: SurveyJsonRecord): number {
  return Array.isArray(source.choices) ? source.choices.length : 0;
}

function addDropdownChoicesStats(
  stats: FormDiagnosticsStats,
  source: SurveyJsonRecord,
): void {
  stats.dropdownCount++;
  const choicesCount = getChoiceCount(source);
  stats.totalDropdownChoicesCount += choicesCount;
  stats.maxDropdownChoicesCount = Math.max(
    stats.maxDropdownChoicesCount,
    choicesCount,
  );
}

function addChoicesJsonSizeStats(
  stats: FormDiagnosticsStats,
  choices: unknown,
): void {
  if (choices == null) {
    return;
  }

  const size = JSON.stringify(choices).length;
  stats.totalChoicesJsonSize += size;
  stats.maxChoicesJsonSize = Math.max(stats.maxChoicesJsonSize, size);
}

function isDropdownMatrixColumn(column: SurveyJsonRecord): boolean {
  return column.cellType === "dropdown" || column.type === "dropdown";
}

function getPanelChildElements(panel: SurveyJsonRecord): unknown[] | null {
  if (Array.isArray(panel.elements)) {
    return panel.elements;
  }
  if (Array.isArray(panel.templateElements)) {
    return panel.templateElements;
  }
  return null;
}

/**
 * Analyze survey from JSON (used when SurveyModel is not available).
 */
export function analyzeSurvey(jsonData: string): FormDiagnosticsStats {
  const stats = emptyStats();
  stats.uncompressedSize = getUtf8ByteLength(jsonData);

  if (!jsonData) return stats;

  try {
    const survey = JSON.parse(jsonData);

    // This JSON fallback mirrors common SurveyJS element structures. In the
    // creator tab, live SurveyModel stats overlay these counts.
    const handlePanelElement = (element: SurveyJsonRecord, type: string) => {
      const children = getPanelChildElements(element);
      if (children) {
        traverseElements(children);
      }
      if (type === "paneldynamic") {
        stats.totalQuestions++;
      }
    };

    const handleMatrixElement = (element: SurveyJsonRecord) => {
      stats.totalQuestions++;

      if (!Array.isArray(element.columns)) {
        return;
      }

      element.columns.forEach((column) => {
        const colObj = asRecord(column);
        if (!colObj || !isDropdownMatrixColumn(colObj)) {
          return;
        }

        addDropdownChoicesStats(stats, colObj);
        addChoicesJsonSizeStats(stats, colObj.choices);
      });
    };

    const handleQuestionElement = (element: SurveyJsonRecord, type: string) => {
      stats.totalQuestions++;

      if (type === "dropdown") {
        addDropdownChoicesStats(stats, element);
      }

      if (SELECT_BASE_TYPES.has(type)) {
        addChoicesJsonSizeStats(stats, element.choices);
      }

      if (type === "file") {
        stats.fileUploadCount++;
        if (element.storeDataAsText !== false) {
          stats.fileUploadWithoutBlobCount++;
        }
      }

      if (type === "scandit") {
        stats.scanditCount++;
      }
    };

    const traverseElements = (elements: unknown[]) => {
      if (!Array.isArray(elements)) return;

      elements.forEach((element) => {
        const obj = asRecord(element);
        const type = typeof obj?.type === "string" ? obj.type : "";
        if (!obj || !type) {
          return;
        }

        if (type === "panel" || type === "paneldynamic") {
          handlePanelElement(obj, type);
          return;
        }

        if (type === "matrixdynamic" || type === "matrixdropdown") {
          handleMatrixElement(obj);
          return;
        }

        handleQuestionElement(obj, type);
      });
    };

    if (survey.pages && Array.isArray(survey.pages)) {
      survey.pages.forEach((page: unknown) => {
        const pageObj = asRecord(page);
        if (Array.isArray(pageObj?.elements)) {
          traverseElements(pageObj.elements);
        }
      });
    }
  } catch (error) {
    console.error("Failed to parse survey JSON for analysis", error);
  }

  return stats;
}

/**
 * Partial stats computed from SurveyModel (overlay on JSON-based stats when survey is available).
 */
export function analyzeSurveyModel(
  survey: SurveyModel,
): Partial<FormDiagnosticsStats> {
  const partial: Partial<FormDiagnosticsStats> = {
    totalQuestions: 0,
    dropdownCount: 0,
    totalDropdownChoicesCount: 0,
    maxDropdownChoicesCount: 0,
    totalChoicesJsonSize: 0,
    maxChoicesJsonSize: 0,
    fileUploadCount: 0,
    fileUploadWithoutBlobCount: 0,
    scanditCount: 0,
  };

  const jsonObj = new JsonObject();

  function measureChoicesSize(choices: unknown): void {
    if (choices == null) return;
    const size = JSON.stringify(choices).length;
    partial.totalChoicesJsonSize! += size;
    partial.maxChoicesJsonSize = Math.max(
      partial.maxChoicesJsonSize ?? 0,
      size,
    );
  }

  const questions = survey.getAllQuestions(false, undefined, true);
  partial.totalQuestions = questions.length;

  function countDropdownChoices(question: Question): void {
    const q = question as Record<string, unknown>;
    partial.dropdownCount!++;
    const choices = q.choices;
    const count = Array.isArray(choices) ? choices.length : 0;
    partial.totalDropdownChoicesCount! += count;
    partial.maxDropdownChoicesCount = Math.max(
      partial.maxDropdownChoicesCount ?? 0,
      count,
    );
  }

  function measureQuestionChoicesSize(question: Question): void {
    const q = question as unknown as { jsonObj?: unknown };
    const qJson = q.jsonObj ?? jsonObj.toJsonObject(question);
    const choices = (qJson as Record<string, unknown> | undefined)?.choices;
    measureChoicesSize(choices);
  }

  function handleMatrixColumnChoices(question: Question): void {
    const columns = (question as { columns?: unknown[] }).columns ?? [];
    for (const col of columns) {
      const c = col as Record<string, unknown>;
      const cellType = c.cellType ?? c.type;
      if (cellType === "dropdown") {
        partial.dropdownCount!++;
        const choices = Array.isArray(c.choices) ? c.choices : [];
        const count = choices.length;
        partial.totalDropdownChoicesCount! += count;
        partial.maxDropdownChoicesCount = Math.max(
          partial.maxDropdownChoicesCount ?? 0,
          count,
        );
        const colJson =
          (c as { jsonObj?: unknown }).jsonObj ?? jsonObj.toJsonObject(c);
        measureChoicesSize(
          (colJson as Record<string, unknown> | undefined)?.choices,
        );
      }
    }
  }

  for (const q of questions) {
    const qType = q.getType();

    if (qType === "dropdown") {
      countDropdownChoices(q);
    }
    if (SELECT_BASE_TYPES.has(qType)) {
      measureQuestionChoicesSize(q);
    }
    if (qType === "matrixdropdown" || qType === "matrixdynamic") {
      handleMatrixColumnChoices(q);
    }
    if (qType === "file") {
      partial.fileUploadCount!++;
      if ((q as any).storeDataAsText !== false) {
        partial.fileUploadWithoutBlobCount!++;
      }
    }
    if (qType === "scandit") {
      partial.scanditCount!++;
    }

  }

  return partial;
}
