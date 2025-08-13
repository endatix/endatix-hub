"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import z from "zod";

interface SubmissionDetailsViewOptions {
  showInvisibleItems: boolean;
  showDynamicVariables: boolean;
  useSubmissionLanguage: boolean;
}

const SubmissionDetailsViewOptionsSchema = z.object({
  showInvisibleItems: z.boolean(),
  showDynamicVariables: z.boolean(),
  useSubmissionLanguage: z.boolean().optional(),
});

interface SubmissionDetailsViewOptionsContextType {
  options: SubmissionDetailsViewOptions;
  updateOption: <K extends keyof SubmissionDetailsViewOptions>(
    key: K,
    value: SubmissionDetailsViewOptions[K],
  ) => void;
  toggleOption: <K extends keyof SubmissionDetailsViewOptions>(key: K) => void;
  resetOptions: () => void;
}

const LOCAL_STORAGE_KEY = "SubmissionDetailsViewOptions";

const defaultOptions: SubmissionDetailsViewOptions = {
  showInvisibleItems: true,
  showDynamicVariables: true,
  useSubmissionLanguage: true,
};

const SubmissionDetailsViewOptionsContext = createContext<
  SubmissionDetailsViewOptionsContextType | undefined
>(undefined);

function SubmissionDetailsViewOptionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [options, setOptions] =
    useState<SubmissionDetailsViewOptions>(defaultOptions);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const result = SubmissionDetailsViewOptionsSchema.safeParse(parsed);
      if (result.success) {
        // Merge with defaults to ensure new options (like useSubmissionLanguage) are set
        setOptions((prev) => ({ ...prev, ...defaultOptions, ...result.data }));
      }
    } catch {
      return;
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(options));
  }, [options]);

  const updateOption = <K extends keyof SubmissionDetailsViewOptions>(
    key: K,
    value: SubmissionDetailsViewOptions[K],
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const toggleOption = <K extends keyof SubmissionDetailsViewOptions>(
    key: K,
  ) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetOptions = () => setOptions(defaultOptions);

  const contextValue = useMemo(
    () => ({ options, updateOption, toggleOption, resetOptions }),
    [options],
  );

  return (
    <SubmissionDetailsViewOptionsContext.Provider value={contextValue}>
      {children}
    </SubmissionDetailsViewOptionsContext.Provider>
  );
}

function useSubmissionDetailsViewOptions() {
  const context = useContext(SubmissionDetailsViewOptionsContext);
  if (context === undefined) {
    throw new Error(
      "useSubmissionDetailsViewOptions must be used within SubmissionDetailsViewOptionsProvider",
    );
  }
  return context;
}

export {
  SubmissionDetailsViewOptionsProvider,
  useSubmissionDetailsViewOptions,
  SubmissionDetailsViewOptionsSchema,
};
