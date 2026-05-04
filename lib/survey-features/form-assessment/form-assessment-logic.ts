import { JsonObject, type SurveyModel } from "survey-core";

const DATA_URL_PREFIX = "data:image/";
const BASE64_MARKER = ";base64,";

export interface FormAssessmentStats {
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

const emptyStats = (): FormAssessmentStats => ({
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

/**
 * Analyze survey from JSON (used when SurveyModel is not available).
 */
export function analyzeSurvey(jsonData: string): FormAssessmentStats {
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
    const traverseElements = (elements: any[]) => {
      if (!Array.isArray(elements)) return;

      elements.forEach((element) => {
        if (element.type === "panel" || element.type === "paneldynamic") {
          traverseElements(element.elements || element.templateElements);
          if (element.type === "paneldynamic") {
            stats.totalQuestions++;
          }
        } else if (
          element.type === "matrixdynamic" ||
          element.type === "matrixdropdown"
        ) {
          stats.totalQuestions++;
          if (element.columns && Array.isArray(element.columns)) {
            element.columns.forEach((col: any) => {
              if (col.cellType === "dropdown" || col.type === "dropdown") {
                stats.dropdownCount++;
                const choicesCount = (col.choices || []).length;
                stats.totalDropdownChoicesCount += choicesCount;
                stats.maxDropdownChoicesCount = Math.max(
                  stats.maxDropdownChoicesCount,
                  choicesCount,
                );
                if (col.choices != null) {
                  const size = JSON.stringify(col.choices).length;
                  stats.totalChoicesJsonSize += size;
                  stats.maxChoicesJsonSize = Math.max(
                    stats.maxChoicesJsonSize,
                    size,
                  );
                }
              }
            });
          }
        } else if (element.type) {
          stats.totalQuestions++;

          if (element.type === "dropdown") {
            stats.dropdownCount++;
            const choicesCount = (element.choices || []).length;
            stats.totalDropdownChoicesCount += choicesCount;
            stats.maxDropdownChoicesCount = Math.max(
              stats.maxDropdownChoicesCount,
              choicesCount,
            );
          }

          if (SELECT_BASE_TYPES.has(element.type) && element.choices != null) {
            const size = JSON.stringify(element.choices).length;
            stats.totalChoicesJsonSize += size;
            stats.maxChoicesJsonSize = Math.max(stats.maxChoicesJsonSize, size);
          }

          if (element.type === "file") {
            stats.fileUploadCount++;
            if (element.storeDataAsText !== false) {
              stats.fileUploadWithoutBlobCount++;
            }
          }

          if (element.type === "scandit") {
            stats.scanditCount++;
          }
        }
      });
    };

    if (survey.pages && Array.isArray(survey.pages)) {
      survey.pages.forEach((page: any) => {
        traverseElements(page.elements);
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
): Partial<FormAssessmentStats> {
  const partial: Partial<FormAssessmentStats> = {
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

  for (const q of questions) {
    const qType = q.getType();

    if (qType === "dropdown") {
      partial.dropdownCount!++;
      const choices = (q as any).choices;
      const count = Array.isArray(choices) ? choices.length : 0;
      partial.totalDropdownChoicesCount! += count;
      partial.maxDropdownChoicesCount = Math.max(
        partial.maxDropdownChoicesCount ?? 0,
        count,
      );
    }
    if (SELECT_BASE_TYPES.has(qType)) {
      const qJson = (q as any).jsonObj ?? jsonObj.toJsonObject(q);
      const choices = qJson?.choices;
      measureChoicesSize(choices);
    }
    if (qType === "matrixdropdown" || qType === "matrixdynamic") {
      const columns = (q as any).columns ?? [];
      for (const col of columns) {
        const cellType = (col as any).cellType ?? (col as any).type;
        if (cellType === "dropdown") {
          partial.dropdownCount!++;
          const choices = (col as any).choices ?? [];
          const count = Array.isArray(choices) ? choices.length : 0;
          partial.totalDropdownChoicesCount! += count;
          partial.maxDropdownChoicesCount = Math.max(
            partial.maxDropdownChoicesCount ?? 0,
            count,
          );
          const colJson = (col as any).jsonObj ?? jsonObj.toJsonObject(col);
          measureChoicesSize(colJson?.choices);
        }
      }
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

    // Title and description: check all locale variants (e.g. { "es": "...", "default": "..." })
    const rawTitle =
      (q as any).locTitle?.values ??
      (q as any).title ??
      (q as any).locTitle?.getLocaleText?.();
    const rawDesc =
      (q as any).locDescription?.values ??
      (q as any).description ??
      (q as any).locDescription?.getLocaleText?.();
    const titleValues = getAllLocalizedStrings(rawTitle);
    const descValues = getAllLocalizedStrings(rawDesc);
    for (const s of titleValues) {
      const t = extractBase64ImagesFromString(s);
      partial.embeddedImagesCount! += t.count;
      partial.embeddedImagesSizeBytes! += t.sizeBytes;
    }
    for (const s of descValues) {
      const d = extractBase64ImagesFromString(s);
      partial.embeddedImagesCount! += d.count;
      partial.embeddedImagesSizeBytes! += d.sizeBytes;
    }

    // Select-base questions: choices[].text can contain embedded images (and can be localized)
    if (SELECT_BASE_TYPES.has(qType)) {
      const choices = (q as any).choices ?? [];
      for (const choice of choices) {
        const rawText =
          (choice as any).locText?.values ??
          (choice as any).text ??
          (choice as any).locText?.getLocaleText?.();
        const textValues = getAllLocalizedStrings(rawText);
        for (const s of textValues) {
          const c = extractBase64ImagesFromString(s);
          partial.embeddedImagesCount! += c.count;
          partial.embeddedImagesSizeBytes! += c.sizeBytes;
        }
      }
    }

    // Matrix columns with choices (e.g. dropdown columns): column.choices[].text
    if (qType === "matrixdropdown" || qType === "matrixdynamic") {
      const columns = (q as any).columns ?? [];
      for (const col of columns) {
        const colChoices = (col as any).choices ?? [];
        for (const choice of colChoices) {
          const rawText =
            (choice as any).locText?.values ??
            (choice as any).text ??
            (choice as any).locText?.getLocaleText?.();
          const textValues = getAllLocalizedStrings(rawText);
          for (const s of textValues) {
            const c = extractBase64ImagesFromString(s);
            partial.embeddedImagesCount! += c.count;
            partial.embeddedImagesSizeBytes! += c.sizeBytes;
          }
        }
      }
    }

    if (qType === "image") {
      const link = (q as any).imageLink;
      const img = extractBase64ImagesFromString(link);
      partial.embeddedImagesCount! += img.count;
      partial.embeddedImagesSizeBytes! += img.sizeBytes;
    }
    if (qType === "html") {
      const rawHtml =
        (q as any).locHtml?.values ??
        (q as any).html ??
        (q as any).locHtml?.getLocaleText?.();
      const htmlValues = getAllLocalizedStrings(rawHtml);
      for (const s of htmlValues) {
        const h = extractBase64ImagesFromString(s);
        partial.embeddedImagesCount! += h.count;
        partial.embeddedImagesSizeBytes! += h.sizeBytes;
      }
    }
  }

  const logoStr = (survey as any).logo;
  const logo = extractBase64ImagesFromString(logoStr);
  partial.embeddedImagesCount! += logo.count;
  partial.embeddedImagesSizeBytes! += logo.sizeBytes;

  return partial;
}
