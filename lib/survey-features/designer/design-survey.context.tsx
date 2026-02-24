"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface DesignSurveyState {
  hasUnsavedChanges: boolean;
  hasJsonErrors: boolean;
  isOnJsonTab: boolean;
  isJsonModified: boolean;
}

export interface DesignSurveyContextValue extends DesignSurveyState {
  setHasUnsavedChanges: (value: boolean) => void;
  setHasJsonErrors: (value: boolean) => void;
  setIsOnJsonTab: (value: boolean) => void;
  setIsJsonModified: (value: boolean) => void;
}

const DesignSurveyContext = createContext<DesignSurveyContextValue | null>(
  null,
);

export function DesignSurveyProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasJsonErrors, setHasJsonErrors] = useState(false);
  const [isOnJsonTab, setIsOnJsonTab] = useState(false);
  const [isJsonModified, setIsJsonModified] = useState(false);

  const value = useMemo<DesignSurveyContextValue>(
    () => ({
      hasUnsavedChanges,
      hasJsonErrors,
      isOnJsonTab,
      isJsonModified,
      setHasUnsavedChanges,
      setHasJsonErrors,
      setIsOnJsonTab,
      setIsJsonModified,
    }),
    [hasUnsavedChanges, hasJsonErrors, isOnJsonTab, isJsonModified],
  );

  return (
    <DesignSurveyContext value={value}>
      {children}
    </DesignSurveyContext>
  );
}

export function useSurveyDesigner(): DesignSurveyContextValue {
  const ctx = useContext(DesignSurveyContext);
  if (ctx === null) {
    throw new Error(
      "useSurveyDesigner must be used within a SurveyDesignProvider",
    );
  }
  return ctx;
}
