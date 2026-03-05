"use client";

import { Submission } from "@/lib/endatix-api";
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
import { createColumnVisibilityStore } from "./column-visibility-store";

interface ColumnVisibilityContextType {
  columnVisibility: Record<string, boolean>;
  defaultColumnVisibility: Record<string, boolean>;
  setColumnVisibility: (visibility: Record<string, boolean>) => void;
  toggleColumnVisibility: (columnId: string) => void;
  resetToDefault: () => void;
  hasCustomVisibility: boolean;
}

const ColumnVisibilityContext = createContext<
  ColumnVisibilityContextType | undefined
>(undefined);

interface ColumnVisibilityProviderProps<TData extends Submission = Submission> {
  children: ReactNode;
  formId: string;
  defaultColumns: ColumnDef<TData>[];
}

export function ColumnVisibilityProvider<TData extends Submission = Submission>({
  children,
  formId,
  defaultColumns,
}: ColumnVisibilityProviderProps<TData>) {
  const defaultColumnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    defaultColumns.forEach((col) => {
      if (col.id && col.id !== "actions") {
        visibility[col.id] = true;
      }
    });
    return visibility;
  }, [defaultColumns]);

  const [columnVisibility, setColumnVisibilityState] = useState<
    Record<string, boolean>
  >(() => {
    if (globalThis.window === undefined) {
      return defaultColumnVisibility;
    }

    const store = createColumnVisibilityStore(formId);
    const saved = store.getColumnVisibility();

    if (saved && Object.keys(saved).length > 0) {
      const validVisibility: Record<string, boolean> = {};

      Object.keys(defaultColumnVisibility).forEach((id) => {
        if (id in saved) {
          validVisibility[id] = saved[id];
        } else {
          validVisibility[id] = true;
        }
      });

      return validVisibility;
    }

    return defaultColumnVisibility;
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const store = createColumnVisibilityStore(formId);
    store.saveColumnVisibility(columnVisibility);
  }, [formId, columnVisibility]);

  const setColumnVisibility = useCallback(
    (visibility: Record<string, boolean>) => {
      setColumnVisibilityState(visibility);
    },
    []
  );

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      if (columnId === "actions") {
        return;
      }

      setColumnVisibilityState((prev) => ({
        ...prev,
        [columnId]: !(prev[columnId] ?? true),
      }));
    },
    []
  );

  const resetToDefault = useCallback(() => {
    setColumnVisibilityState(defaultColumnVisibility);
    const store = createColumnVisibilityStore(formId);
    store.resetColumnVisibility();
  }, [defaultColumnVisibility, formId]);

  const hasCustomVisibility = useMemo(
    () =>
      JSON.stringify(columnVisibility) !==
      JSON.stringify(defaultColumnVisibility),
    [columnVisibility, defaultColumnVisibility]
  );

  const contextValue = useMemo(
    () => ({
      columnVisibility,
      defaultColumnVisibility,
      setColumnVisibility,
      toggleColumnVisibility,
      resetToDefault,
      hasCustomVisibility,
    }),
    [
      columnVisibility,
      defaultColumnVisibility,
      setColumnVisibility,
      toggleColumnVisibility,
      resetToDefault,
      hasCustomVisibility,
    ]
  );

  return (
    <ColumnVisibilityContext value={contextValue}>
      {children}
    </ColumnVisibilityContext>
  );
}

export function useColumnVisibility() {
  const context = useContext(ColumnVisibilityContext);
  if (context === undefined) {
    throw new Error(
      "useColumnVisibility must be used within ColumnVisibilityProvider"
    );
  }
  return context;
}
