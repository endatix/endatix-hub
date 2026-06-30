import { useCallback } from 'react';
import { registerRegexMatchGlobals } from '../infrastructure/registry';

interface RegexMatchInstallApi {
  /**
   * Registers globals (FunctionFactory). Call once before creating any SurveyModel or SurveyCreator.
   */
  initGlobals: () => void;
}

export function useRegexMatch(): RegexMatchInstallApi {
  const initGlobals = useCallback(() => {
    registerRegexMatchGlobals();
  }, []);

  return {
    initGlobals,
  };
}
