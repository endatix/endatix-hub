import { z } from "zod";

const ColumnVisibilityDataSchema = z.object({
  columnVisibility: z.record(z.string(), z.boolean()),
  version: z.number(),
  updatedAt: z.string(),
});

export type ColumnVisibilityData = z.infer<typeof ColumnVisibilityDataSchema>;

export function createColumnVisibilityStore(formId: string) {
  const STORAGE_KEY = `ehx_submissions_column_visibility_${formId}`;

  const getColumnVisibility = (): Record<string, boolean> | null => {
    if (globalThis.window === undefined) {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      const result = ColumnVisibilityDataSchema.safeParse(parsed);

      if (!result.success) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return result.data.columnVisibility;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  const saveColumnVisibility = (visibility: Record<string, boolean>): void => {
    if (globalThis.window === undefined) {
      return;
    }

    try {
      const data: ColumnVisibilityData = {
        columnVisibility: visibility,
        version: 1,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save column visibility:", error);
    }
  };

  const resetColumnVisibility = (): void => {
    if (globalThis.window === undefined) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  };

  const hasStoredVisibility = (): boolean => {
    if (globalThis.window === undefined) {
      return false;
    }

    return getColumnVisibility() !== null;
  };

  return {
    getColumnVisibility,
    saveColumnVisibility,
    resetColumnVisibility,
    hasStoredVisibility,
  };
}
