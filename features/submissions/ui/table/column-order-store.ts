import { z } from "zod";

const ColumnOrderDataSchema = z.object({
  columnOrder: z.array(z.string()),
  version: z.number(),
  updatedAt: z.string(),
});

export type ColumnOrderData = z.infer<typeof ColumnOrderDataSchema>;

export function createColumnOrderStore(formId: string) {
  const STORAGE_KEY = `ehx_submissions_column_order_${formId}`;

  const getColumnOrder = (): string[] | null => {
    if (typeof globalThis.window === "undefined") {
      return null;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      const result = ColumnOrderDataSchema.safeParse(parsed);

      if (!result.success) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return result.data.columnOrder;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  const saveColumnOrder = (order: string[]): void => {
    if (typeof globalThis.window === "undefined") {
      return;
    }

    try {
      const data: ColumnOrderData = {
        columnOrder: order,
        version: 1,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save column order:", error);
    }
  };

  const resetColumnOrder = (): void => {
    if (typeof globalThis.window === "undefined") {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  };

  const hasStoredOrder = (): boolean => {
    if (typeof globalThis.window === "undefined") {
      return false;
    }

    return getColumnOrder() !== null;
  };

  return {
    getColumnOrder,
    saveColumnOrder,
    resetColumnOrder,
    hasStoredOrder,
  };
}
