"use client";

import { Model } from "survey-core";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * The scope of the designer runtime. Supports form, template, and submission scopes.
 */
export type DesignerScope = {
  formId?: string;
  templateId?: string;
  submissionId?: string;
};

/**
 * The state of the designer runtime.
 */
export interface DesignerRuntimeState extends DesignerScope {
  formName?: string;
  folderId?: string | null;
  isPublic?: boolean;
  formIsEnabled?: boolean;
  surveyModel?: Model;
  formAccessJwt?: string;
  formAccessJwtExpiresAtUtc?: string;
}

/**
 * The context value of the designer runtime.
 */
export interface DesignerRuntimeContextValue {
  stateRef: React.RefObject<DesignerRuntimeState>;
  /** Bumped on each updateState call so consumers can react to ref changes. */
  revision: number;
  updateState: (partial: Partial<DesignerRuntimeState>) => void;
}

/**
 * The context of the designer runtime.
 */
const DesignerRuntimeContext =
  createContext<DesignerRuntimeContextValue | null>(null);

/**
 * The props for the designer runtime provider.
 */
export interface DesignerRuntimeProviderProps {
  children: React.ReactNode;
  initialState: DesignerRuntimeState;
}

/**
 * The designer runtime provider. Used to provide the designer runtime context to the children components that expose Survey Creator management capabilities - form editor, template editor, submission viewer.
 */
export function DesignerRuntimeProvider({
  children,
  initialState,
}: Readonly<DesignerRuntimeProviderProps>) {
  const stateRef = useRef<DesignerRuntimeState>({ ...initialState });
  const [revision, setRevision] = useState(0);

  const updateState = useCallback((partial: Partial<DesignerRuntimeState>) => {
    stateRef.current = {
      ...stateRef.current,
      ...partial,
    };
    setRevision((current) => current + 1);
  }, []);

  const contextValue = useMemo(
    () => ({
      stateRef,
      revision,
      updateState,
    }),
    [revision, updateState],
  );

  return (
    <DesignerRuntimeContext.Provider value={contextValue}>
      {children}
    </DesignerRuntimeContext.Provider>
  );
}

/**
 * The hook to use the designer runtime context.
 */
export function useDesignerRuntime(): DesignerRuntimeContextValue {
  const context = useContext(DesignerRuntimeContext);
  if (!context) {
    throw new Error(
      "useDesignerRuntime must be used within a DesignerRuntimeProvider",
    );
  }
  return context;
}

/**
 * The hook to use the optional designer runtime context.
 */
export function useOptionalDesignerRuntime(): DesignerRuntimeContextValue | null {
  return useContext(DesignerRuntimeContext);
}
