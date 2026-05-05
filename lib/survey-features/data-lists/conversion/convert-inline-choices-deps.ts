export type ConvertChoicesUiDeps = {
  getDataListNames: () => string[];
  refreshDataLists: () => Promise<void>;
  markFormModified: () => void;
  /** Resolves when the user confirms or dismisses the convert dialog (shadcn AlertDialog in FormEditor). */
  confirmConvertInlineChoices: () => Promise<boolean>;
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
