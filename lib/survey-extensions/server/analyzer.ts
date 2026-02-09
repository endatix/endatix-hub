import type { ExtensionDefinition } from "@/lib/survey-extensions/types";
import { createFormAnalyzer } from "@/lib/survey-extensions/extension-utils";

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

  // Create analyzer once to avoid repeated JSON stringification
  const analyzer = createFormAnalyzer(formDefinition);

  return availableExtensions
    .filter((ext) => {
      if (!ext.shouldLoad) {
        return true;
      }

      try {
        return ext.shouldLoad(formDefinition, analyzer);
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
