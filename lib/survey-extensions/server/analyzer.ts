import type { ExtensionDefinition } from "../types";

/**
 * Server-side analyzer to determine which extensions are required for a given form definition. Idea is to laod only what's needed for performance and controlling the features that should be available.
 *
 * @param formDefinition - The form JSON to analyze
 * @param availableExtensions - All available extension definitions
 * @returns Array of extension IDs that should be activated
 */
export function getRequiredExtensionIds(
  formDefinition: any,
  availableExtensions: ExtensionDefinition[],
): string[] {
  if (!formDefinition) {
    return [];
  }

  return availableExtensions
    .filter((ext) => {
      if (!ext.shouldActivate) {
        return true;
      }

      try {
        return ext.shouldActivate(formDefinition);
      } catch (error) {
        console.error(
          `[Endatix] Error in shouldActivate for extension ${ext.id}:`,
          error,
        );
        return false;
      }
    })
    .map((ext) => ext.id);
}

/**
 * Check if form uses a specific question type
 *
 * @param formJson - The form definition JSON
 * @param questionType - The question type to search for
 * @returns true if the form contains the question type
 */
export function formUsesQuestionType(
  formJson: any,
  questionType: string,
): boolean {
  const jsonString = JSON.stringify(formJson);
  return jsonString.includes(`"type":"${questionType}"`);
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
