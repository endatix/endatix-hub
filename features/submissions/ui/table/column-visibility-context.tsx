"use client";

import { Submission } from "@/lib/endatix-api";
import { useIsMobile } from "@/lib/utils/hooks/use-media-query.hook";
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
import { withNarrowViewportDefaults } from "./narrow-viewport-columns";

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
  readonly children: ReactNode;
  readonly formId: string;
  readonly defaultColumns: ColumnDef<TData>[];
}

export function ColumnVisibilityProvider<
  TData extends Submission = Submission,
>({ children, formId, defaultColumns }: ColumnVisibilityProviderProps<TData>) {
  const isMobile = useIsMobile();
  const hasStoredPrefsRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  const baseDefaultColumnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    defaultColumns.forEach((col) => {
      if (col.id && col.id !== "actions") {
        visibility[col.id] = col.meta?.defaultHidden !== true;
      }
    });
    return visibility;
  }, [defaultColumns]);

  const defaultColumnVisibility = useMemo(
    () =>
      withNarrowViewportDefaults(baseDefaultColumnVisibility, {
        isNarrow: isMobile,
        respectUserPrefs: false,
      }),
    [baseDefaultColumnVisibility, isMobile],
  );

  const [columnVisibility, setColumnVisibilityState] = useState<
    Record<string, boolean>
  >(baseDefaultColumnVisibility);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    const store = createColumnVisibilityStore(formId);
    const saved = store.getColumnVisibility();

    if (saved && Object.keys(saved).length > 0) {
      hasStoredPrefsRef.current = true;
      const validVisibility: Record<string, boolean> = {};
      Object.keys(baseDefaultColumnVisibility).forEach((id) => {
        if (id in saved) {
          validVisibility[id] = saved[id];
        } else {
          validVisibility[id] = baseDefaultColumnVisibility[id];
        }
      });

      setColumnVisibilityState((prev) =>
        JSON.stringify(prev) === JSON.stringify(validVisibility)
          ? prev
          : validVisibility,
      );
      return;
    }

    hasStoredPrefsRef.current = false;
    skipNextSaveRef.current = true;
    const softDefaults = withNarrowViewportDefaults(
      baseDefaultColumnVisibility,
      {
        isNarrow: isMobile,
        respectUserPrefs: false,
      },
    );
    setColumnVisibilityState((prev) =>
      JSON.stringify(prev) === JSON.stringify(softDefaults)
        ? prev
        : softDefaults,
    );
  }, [formId, baseDefaultColumnVisibility, isMobile]);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const store = createColumnVisibilityStore(formId);
    store.saveColumnVisibility(columnVisibility);
    hasStoredPrefsRef.current = true;
  }, [formId, columnVisibility]);

  const setColumnVisibility = useCallback(
    (visibility: Record<string, boolean>) => {
      hasStoredPrefsRef.current = true;
      setColumnVisibilityState(visibility);
    },
    [],
  );

  const toggleColumnVisibility = useCallback((columnId: string) => {
    if (columnId === "actions") {
      return;
    }

    hasStoredPrefsRef.current = true;
    setColumnVisibilityState((prev) => ({
      ...prev,
      [columnId]: !(prev[columnId] ?? true),
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    hasStoredPrefsRef.current = false;
    skipNextSaveRef.current = true;
    const store = createColumnVisibilityStore(formId);
    store.resetColumnVisibility();
    setColumnVisibilityState(
      withNarrowViewportDefaults(baseDefaultColumnVisibility, {
        isNarrow: isMobile,
        respectUserPrefs: false,
      }),
    );
  }, [baseDefaultColumnVisibility, formId, isMobile]);

  const hasCustomVisibility = useMemo(
    () =>
      JSON.stringify(columnVisibility) !==
      JSON.stringify(defaultColumnVisibility),
    [columnVisibility, defaultColumnVisibility],
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
    ],
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
      "useColumnVisibility must be used within ColumnVisibilityProvider",
    );
  }
  return context;
}
