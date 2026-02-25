"use client";

import { Submission } from "@/lib/endatix-api";
import { arrayMove } from "@dnd-kit/sortable";
import { ColumnDef } from "@tanstack/react-table";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createColumnOrderStore } from "./column-order-store";

interface ColumnOrderContextType {
  columnOrder: string[];
  defaultColumnOrder: string[];
  setColumnOrder: (order: string[]) => void;
  reorderColumn: (activeId: string, overId: string) => void;
  resetToDefault: () => void;
  hasCustomOrder: boolean;
}

const ColumnOrderContext = createContext<ColumnOrderContextType | undefined>(
  undefined,
);

interface ColumnOrderProviderProps<TData extends Submission = Submission> {
  children: ReactNode;
  formId: string;
  defaultColumns: ColumnDef<TData>[];
}

export function ColumnOrderProvider<TData extends Submission = Submission>({
  children,
  formId,
  defaultColumns,
}: ColumnOrderProviderProps<TData>) {
  const defaultColumnOrder = useMemo(
    () => defaultColumns.map((col) => col.id as string).filter(Boolean),
    [defaultColumns],
  );

  const [columnOrder, setColumnOrderState] = useState<string[]>(() => {
    if (typeof globalThis.window === "undefined") {
      return defaultColumnOrder;
    }

    const store = createColumnOrderStore(formId);
    const saved = store.getColumnOrder();

    if (saved && saved.length > 0) {
      const validOrder = saved.filter((id) => defaultColumnOrder.includes(id));

      const missingColumns = defaultColumnOrder.filter(
        (id) => !validOrder.includes(id),
      );

      const finalOrder = [...validOrder, ...missingColumns];
      return finalOrder;
    }

    return defaultColumnOrder;
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (typeof globalThis.window === "undefined") {
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const store = createColumnOrderStore(formId);
    store.saveColumnOrder(columnOrder);
  }, [formId, columnOrder]);

  const setColumnOrder = useCallback((order: string[]) => {
    setColumnOrderState(order);
  }, []);

  const reorderColumn = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === "actions" || overId === "actions") {
        return;
      }

      const oldIndex = columnOrder.indexOf(activeId);
      const newIndex = columnOrder.indexOf(overId);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
      setColumnOrderState(newOrder);
    },
    [columnOrder]
  );

  const resetToDefault = useCallback(() => {
    setColumnOrderState(defaultColumnOrder);
    const store = createColumnOrderStore(formId);
    store.resetColumnOrder();
  }, [defaultColumnOrder, formId]);

  const hasCustomOrder = useMemo(
    () => JSON.stringify(columnOrder) !== JSON.stringify(defaultColumnOrder),
    [columnOrder, defaultColumnOrder],
  );

  const contextValue = useMemo(
    () => ({
      columnOrder,
      defaultColumnOrder,
      setColumnOrder,
      reorderColumn,
      resetToDefault,
      hasCustomOrder,
    }),
    [columnOrder, defaultColumnOrder, setColumnOrder, reorderColumn, resetToDefault, hasCustomOrder],
  );

  return (
    <ColumnOrderContext.Provider value={contextValue}>
      {children}
    </ColumnOrderContext.Provider>
  );
}

export function useColumnOrder() {
  const context = useContext(ColumnOrderContext);
  if (context === undefined) {
    throw new Error("useColumnOrder must be used within ColumnOrderProvider");
  }
  return context;
}
