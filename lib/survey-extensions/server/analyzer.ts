/**
 * Server-side extension analyzer
 *
 * Analyzes form JSON to determine which extensions are required.
 * Enables smart preloading - only load extensions that are actually used.
 */

import type { ExtensionDefinition } from "../types";

/**
 * Analyzes form definition and returns IDs of required extensions
 *
 * @param formDefinition - The form JSON definition
 * @param availableExtensions - All available extensions to check against
 * @returns Array of extension IDs that are needed for this form
 *
 * @example
 * const required = getRequiredExtensionIds(formJson, allExtensions);
 * // Returns: ['audio-recorder', 'camera-fix']
 */
export function getRequiredExtensionIds(
  formDefinition: any,
  availableExtensions: ExtensionDefinition[],
): string[] {
  if (!formDefinition) {
    return [];
  }

  // Extensions that should always be included (e.g., global patches)
  const alwaysInclude: string[] = [];

  // Find extensions with 'init' type or those without detect functions
  // These typically contain global patches that should always run
  const initExtensions = availableExtensions
    .filter((ext) => !ext.detect)
    .map((ext) => ext.id);

  // Detect extensions based on form content
  const detectedExtensions = availableExtensions
    .filter((ext) => ext.detect && ext.detect(formDefinition))
    .map((ext) => ext.id);

  // Combine and deduplicate
  return [
    ...new Set([...alwaysInclude, ...initExtensions, ...detectedExtensions]),
  ];
}

/**
 * Helper function to detect if a form uses a specific question type
 *
 * @param formJson - The form JSON definition
 * @param questionType - The question type to search for
 * @returns true if the question type is found
 */
export function formUsesQuestionType(
  formJson: any,
  questionType: string,
): boolean {
  const jsonString = JSON.stringify(formJson);
  return jsonString.includes(`"type":"${questionType}"`);
}

/**
 * Helper function to extract all unique question types from a form
 *
 * @param formJson - The form JSON definition
 * @returns Array of unique question type strings
 */
export function extractQuestionTypes(formJson: any): string[] {
  if (!formJson) return [];

  const types = new Set<string>();
  const jsonString = JSON.stringify(formJson);

  // Find all "type":"value" patterns
  const typeMatches = jsonString.matchAll(/"type"\s*:\s*"([^"]+)"/g);

  for (const match of typeMatches) {
    if (match[1]) {
      types.add(match[1]);
    }
  }

  return Array.from(types);
}
