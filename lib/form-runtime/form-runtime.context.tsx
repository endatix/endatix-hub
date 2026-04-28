"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";

import { Model } from "survey-core";

export const ENDATIX_FORM_RUNTIME_CONTEXT = "ENDATIX_FORM_RUNTIME_CONTEXT";

export interface FormRuntimeState {
  formId: string;
  token?: string;
  tokenType?: string;
  submissionId?: string;
  surveyModel?: Model;
}

export interface FormRuntimeContextValue {
  stateRef: React.RefObject<FormRuntimeState>;
  updateState: (newState: Partial<FormRuntimeState>) => void;
}

const FormRuntimeContext = createContext<FormRuntimeContextValue | null>(null);

export interface FormRuntimeProviderProps {
  children: React.ReactNode;
  initialState: FormRuntimeState;
}

export function FormRuntimeProvider({
  children,
  initialState,
}: Readonly<FormRuntimeProviderProps>) {
  const stateRef = useRef<FormRuntimeState>(initialState);

  const updateState = useCallback((newState: Partial<FormRuntimeState>) => {
    stateRef.current = {
      ...stateRef.current,
      ...newState,
    };
  }, []);

  const contextValue = useMemo(() => {
    return {
      stateRef,
      updateState,
    };
  }, [stateRef, updateState]);

  return (
    <FormRuntimeContext.Provider value={contextValue}>
      {children}
    </FormRuntimeContext.Provider>
  );
}

export const useFormRuntime = (): FormRuntimeContextValue => {
  const context = useContext(FormRuntimeContext);
  if (!context) {
    throw new Error("useFormRuntime must be used within a FormRuntimeProvider");
  }
  return context;
};
