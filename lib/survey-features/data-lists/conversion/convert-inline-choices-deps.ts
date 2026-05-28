import type { DataList } from "@/lib/endatix-api/data-lists/types";
import type { Question } from "survey-core";

/**
 * The convert choices UI dependencies.
 */
export type ConvertChoicesUiDeps = {
  getDataListNames: () => string[];
  refreshDataLists: () => Promise<void>;
  /**
   * Updates Serializer choices, binds the question, and refreshes the Creator
   * property grid when the question is selected.
   */
  completeDataListBinding: (
    question: Question,
    dataList: Pick<DataList, "id" | "name">,
  ) => void;
  markFormModified: () => void;
  /**
   * Opens the convert dialog and resolves with selected list name, or null if cancelled.
   * errorMessage can be used to re-open the dialog after validation/server failure.
   */
  confirmConvertInlineChoices: (input?: {
    initialName: string;
    errorMessage?: string;
  }) => Promise<string | null>;
};

let deps: ConvertChoicesUiDeps | null = null;

/**
 * Registers the convert choices UI dependencies.
 * @param next - The next dependencies to register.
 */
export function registerConvertChoicesUiDeps(
  next: ConvertChoicesUiDeps | null,
): void {
  deps = next;
}

/**
 * Gets the convert choices UI dependencies.
 * @returns The convert choices UI dependencies.
 */
export function getConvertChoicesUiDeps(): ConvertChoicesUiDeps | null {
  return deps;
}
