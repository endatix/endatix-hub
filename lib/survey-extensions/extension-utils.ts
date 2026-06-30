export interface FormAnalyzer {
  /**
   * The original form JSON object
   */
  formJson: any;

  /**
   * Check if form uses a specific question type
   * Optimized to search in the stringified JSON without re-parsing/re-stringifying
   */
  usesQuestionType: (questionType: string) => boolean;

  /**
   * Check if form JSON defines a custom Serializer property by name.
   * Traverses parsed JSON so property names inside string values are not matched.
   */
  hasCustomProperty: (propertyName: string) => boolean;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formContainsPropertyKey(obj: unknown, propertyName: string): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  let found = false;

  const traverse = (current: unknown) => {
    if (found || !current || typeof current !== "object") {
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(traverse);
      return;
    }

    const record = current as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(record, propertyName)) {
      found = true;
      return;
    }

    Object.values(record).forEach(traverse);
  };

  traverse(obj);
  return found;
}

function parseFormJson(formJson: unknown): unknown | null {
  if (typeof formJson === "string") {
    if (formJson.length === 0) {
      return null;
    }

    try {
      return JSON.parse(formJson);
    } catch {
      return null;
    }
  }

  return formJson;
}

/**
 * Creates a form analyzer with cached string representation
 * @param formJson - The form definition JSON
 */
export function createFormAnalyzer(formJson: any): FormAnalyzer {
  if (!formJson) {
    return {
      formJson: null,
      usesQuestionType: () => false,
      hasCustomProperty: () => false,
    };
  }

  const jsonString =
    typeof formJson === "string" ? formJson : JSON.stringify(formJson);
  const parsedFormJson = parseFormJson(formJson);

  return {
    formJson,
    usesQuestionType: (questionType: string) => {
      if (jsonString.length === 0) {
        return false;
      }

      const questionTypePattern = String.raw`"type"\s*:\s*"${escapeRegExp(questionType)}"`;
      const regex = new RegExp(questionTypePattern);
      return regex.test(jsonString);
    },
    hasCustomProperty: (propertyName: string) => {
      if (!parsedFormJson) {
        return false;
      }

      return formContainsPropertyKey(parsedFormJson, propertyName);
    },
  };
}

/**
 * Extract all unique question types from form JSON
 *
 * @param formJson - The form definition JSON
 * @returns Array of unique question types used in the form
 */
export function extractQuestionTypes(formJson: any): string[] {
  const types = new Set<string>();

  const traverse = (obj: any) => {
    if (!obj || typeof obj !== "object") return;

    if (obj.type && typeof obj.type === "string") {
      types.add(obj.type);
    }

    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else {
      Object.values(obj).forEach(traverse);
    }
  };

  traverse(formJson);
  return Array.from(types);
}
