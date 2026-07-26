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

function visibilityEquals(
  left: Record<string, boolean>,
  right: Record<string, boolean>,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function ColumnVisibilityProvider<
  TData extends Submission = Submission,
>({ children, formId, defaultColumns }: ColumnVisibilityProviderProps<TData>) {
  const isMobile = useIsMobile();
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
      const validVisibility: Record<string, boolean> = {};
      Object.keys(baseDefaultColumnVisibility).forEach((id) => {
        if (id in saved) {
          validVisibility[id] = saved[id];
        } else {
          validVisibility[id] = baseDefaultColumnVisibility[id];
        }
      });

      setColumnVisibilityState((prev) =>
        visibilityEquals(prev, validVisibility) ? prev : validVisibility,
      );
      return;
    }

    const softDefaults = withNarrowViewportDefaults(
      baseDefaultColumnVisibility,
      {
        isNarrow: isMobile,
      },
    );
    setColumnVisibilityState((prev) => {
      if (visibilityEquals(prev, softDefaults)) {
        return prev;
      }

      skipNextSaveRef.current = true;
      return softDefaults;
    });
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
  }, [formId, columnVisibility]);

  const setColumnVisibility = useCallback(
    (visibility: Record<string, boolean>) => {
      setColumnVisibilityState(visibility);
    },
    [],
  );

  const toggleColumnVisibility = useCallback((columnId: string) => {
    if (columnId === "actions") {
      return;
    }

    setColumnVisibilityState((prev) => ({
      ...prev,
      [columnId]: !(prev[columnId] ?? true),
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    const store = createColumnVisibilityStore(formId);
    store.resetColumnVisibility();
    const next = withNarrowViewportDefaults(baseDefaultColumnVisibility, {
      isNarrow: isMobile,
    });
    setColumnVisibilityState((prev) => {
      if (visibilityEquals(prev, next)) {
        return prev;
      }

      skipNextSaveRef.current = true;
      return next;
    });
  }, [baseDefaultColumnVisibility, formId, isMobile]);

  const hasCustomVisibility = useMemo(
    () => !visibilityEquals(columnVisibility, defaultColumnVisibility),
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
