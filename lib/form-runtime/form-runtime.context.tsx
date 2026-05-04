"use client";

import {
  ensureRuntimeFormAccessJwt,
  invalidateRuntimeFormAccessJwt,
} from "@/lib/form-runtime/form-access-jwt-orchestrator";
import { Model } from "survey-core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  startTransition,
} from "react";

export interface FormRuntimeState {
  formId: string;
  /** Legacy access/submission token — only used when creating the form access JWT as invite link. */
  token?: string;
  tokenType?: string;
  submissionId?: string;
  surveyModel?: Model;
  formAccessJwt?: string;
  formAccessJwtExpiresAtUtc?: string;
}

export interface FormRuntimeContextValue {
  stateRef: React.RefObject<FormRuntimeState>;
  updateState: (newState: Partial<FormRuntimeState>) => void;
  /** Returns a cached or freshly created form access JWT (non-throwing). */
  ensureFormAccessJwt: () => Promise<string | undefined>;
  /** Clears cached JWT so the next ensure creates a new one (e.g. after 401). */
  invalidateFormAccessJwt: () => void;
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

  const invalidateFormAccessJwt = useCallback(() => {
    startTransition(() => {
      invalidateRuntimeFormAccessJwt(stateRef.current);
    });
  }, []);

  const ensureFormAccessJwt = useCallback(async () => {
    return ensureRuntimeFormAccessJwt(stateRef.current);
  }, []);

  useEffect(() => {
    startTransition(() => {
      void ensureFormAccessJwt();
    });
  }, [ensureFormAccessJwt]);

  const contextValue = useMemo(() => {
    return {
      stateRef,
      updateState,
      ensureFormAccessJwt,
      invalidateFormAccessJwt,
    };
  }, [updateState, ensureFormAccessJwt, invalidateFormAccessJwt]);

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
