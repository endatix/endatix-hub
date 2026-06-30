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
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    };
  }

  const jsonString =
    typeof formJson === "string" ? formJson : JSON.stringify(formJson);

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
