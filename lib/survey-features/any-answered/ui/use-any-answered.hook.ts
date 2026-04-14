import { useCallback } from "react";
import { registerAnyAnsweredGlobals } from "../infrastructure/registry";

interface AnyAnsweredInstallApi {
  /**
   * Registers globals (FunctionFactory). Call once before creating any SurveyModel or SurveyCreator.
   */
  initGlobals: () => void;
}

export function useAnyAnswered(): AnyAnsweredInstallApi {
  const initGlobals = useCallback(() => {
    registerAnyAnsweredGlobals();
  }, []);

  return {
    initGlobals,
  };
}
