export type ConvertChoicesUiDeps = {
  getDataListNames: () => string[];
  refreshDataLists: () => Promise<void>;
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

export function registerConvertChoicesUiDeps(
  next: ConvertChoicesUiDeps | null,
): void {
  deps = next;
}

export function getConvertChoicesUiDeps(): ConvertChoicesUiDeps | null {
  return deps;
}
