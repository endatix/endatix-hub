import { JsonObject, type SurveyModel } from "survey-core";

const DATA_URL_PREFIX = "data:image/";
const BASE64_MARKER = ";base64,";

export interface FormDiagnosticsStats {
  /** UTF-8 byte size of the serialized survey JSON. */
  uncompressedSize: number;
  totalQuestions: number;
  embeddedImagesCount: number;
  /** Total byte size of embedded base64 images (decoded). */
  embeddedImagesSizeBytes: number;
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
  embeddedImagesCount: 0,
  embeddedImagesSizeBytes: 0,
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

function extractBase64ImagesFromString(text: string | undefined): {
  count: number;
  sizeBytes: number;
} {
  if (!text || typeof text !== "string") return { count: 0, sizeBytes: 0 };
  let count = 0;
  let sizeBytes = 0;
  let idx = 0;
  while (true) {
    const start = text.indexOf(DATA_URL_PREFIX, idx);
    if (start === -1) break;
    const comma = text.indexOf(BASE64_MARKER, start);
    if (comma === -1) break;
    const payloadStart = comma + BASE64_MARKER.length;
    let end = text.indexOf('"', payloadStart);
    if (end === -1) end = text.indexOf("'", payloadStart);
    if (end === -1) end = text.length;
    const payload = text.slice(payloadStart, end).replace(/\s/g, "");
    count += 1;
    sizeBytes += Math.floor((payload.length * 3) / 4);
    idx = payloadStart + payload.length;
  }
  return { count, sizeBytes };
}

function extractBase64ImagesFromValue(value: unknown): {
  count: number;
  sizeBytes: number;
} {
  if (typeof value === "string") {
    return extractBase64ImagesFromString(value);
  }

  if (Array.isArray(value)) {
    return value.reduce(
      (acc, item) => {
        const result = extractBase64ImagesFromValue(item);
        return {
          count: acc.count + result.count,
          sizeBytes: acc.sizeBytes + result.sizeBytes,
        };
      },
      { count: 0, sizeBytes: 0 },
    );
  }

  if (value != null && typeof value === "object") {
    return Object.values(value).reduce(
      (acc, item) => {
        const result = extractBase64ImagesFromValue(item);
        return {
          count: acc.count + result.count,
          sizeBytes: acc.sizeBytes + result.sizeBytes,
        };
      },
      { count: 0, sizeBytes: 0 },
    );
  }

  return { count: 0, sizeBytes: 0 };
}

/**
 * Get all string values from a localized value: a plain string or an object of locale keys to string (e.g. { "es": "...", "default": "..." }).
 */
function getAllLocalizedStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).filter(
      (v): v is string => typeof v === "string",
    );
  }
  return [];
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

function getNonEmptyLocalizedValues(source: unknown): unknown | undefined {
  if (
    source != null &&
    typeof source === "object" &&
    !Array.isArray(source) &&
    Object.keys(source as Record<string, unknown>).length > 0
  ) {
    return source;
  }
  return undefined;
}

function readLocalizedField(
  owner: unknown,
  locKey: "locTitle" | "locDescription" | "locText" | "locHtml",
  rawKey: "title" | "description" | "text" | "html",
): unknown {
  const record = owner as Record<string, unknown> | null;
  const localizedObj =
    record && typeof record === "object"
      ? (record[locKey] as Record<string, unknown> | undefined)
      : undefined;
  const values = getNonEmptyLocalizedValues(localizedObj?.values);
  if (values !== undefined) {
    return values;
  }
  if (record && typeof record === "object") {
    const raw = record[rawKey];
    if (raw !== undefined && raw !== null) {
      return raw;
    }
  }
  const getLocaleText = localizedObj?.getLocaleText;
  if (typeof getLocaleText === "function") {
    return getLocaleText.call(localizedObj);
  }
  return undefined;
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
    const embeddedImages = extractBase64ImagesFromValue(survey);
    stats.embeddedImagesCount = embeddedImages.count;
    stats.embeddedImagesSizeBytes = embeddedImages.sizeBytes;

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
    embeddedImagesCount: 0,
    embeddedImagesSizeBytes: 0,
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

  function countDropdownChoices(question: unknown): void {
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

  function measureQuestionChoicesSize(question: unknown): void {
    const q = question as { jsonObj?: unknown };
    const qJson = q.jsonObj ?? jsonObj.toJsonObject(question);
    const choices = (qJson as Record<string, unknown> | undefined)?.choices;
    measureChoicesSize(choices);
  }

  function handleMatrixColumnChoices(question: unknown): void {
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

  function addImageStatsFromValues(values: string[]): void {
    for (const s of values) {
      const r = extractBase64ImagesFromString(s);
      partial.embeddedImagesCount! += r.count;
      partial.embeddedImagesSizeBytes! += r.sizeBytes;
    }
  }

  function extractImagesFromQuestion(question: unknown): void {
    addImageStatsFromValues(
      getAllLocalizedStrings(readLocalizedField(question, "locTitle", "title")),
    );
    addImageStatsFromValues(
      getAllLocalizedStrings(
        readLocalizedField(question, "locDescription", "description"),
      ),
    );

    const qType = (question as { getType: () => string }).getType();
    if (SELECT_BASE_TYPES.has(qType)) {
      const choices = (question as { choices?: unknown[] }).choices ?? [];
      for (const choice of choices) {
        addImageStatsFromValues(
          getAllLocalizedStrings(readLocalizedField(choice, "locText", "text")),
        );
      }
    }

    if (qType === "matrixdropdown" || qType === "matrixdynamic") {
      const columns = (question as { columns?: unknown[] }).columns ?? [];
      for (const col of columns) {
        const colChoices = (col as { choices?: unknown[] }).choices ?? [];
        for (const choice of colChoices) {
          addImageStatsFromValues(
            getAllLocalizedStrings(
              readLocalizedField(choice, "locText", "text"),
            ),
          );
        }
      }
    }

    if (qType === "image") {
      addImageStatsFromValues([
        String((question as Record<string, unknown>).imageLink ?? ""),
      ]);
    }

    if (qType === "html") {
      addImageStatsFromValues(
        getAllLocalizedStrings(readLocalizedField(question, "locHtml", "html")),
      );
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

    extractImagesFromQuestion(q);
  }

  const logoStr = (survey as any).logo;
  const logo = extractBase64ImagesFromString(logoStr);
  partial.embeddedImagesCount! += logo.count;
  partial.embeddedImagesSizeBytes! += logo.sizeBytes;

  return partial;
}
