import { useCallback } from "react";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { SurveyModel } from "survey-core";
import { registerBlindSearchTagboxGlobals } from "../infrastructure/registry";
import {
  bindBlindSearchToCreator,
  bindBlindSearchToSurvey,
} from "../infrastructure/blind-search-tagbox.extension";

interface BlindSearchTagboxInstallApi {
  initGlobals: () => void;
  bindToSurvey: (survey: SurveyModel) => (() => void) | undefined;
  bindToCreator: (creator: SurveyCreatorModel) => (() => void) | undefined;
}

export function useBlindSearchTagbox(): BlindSearchTagboxInstallApi {
  const initGlobals = useCallback(() => {
    registerBlindSearchTagboxGlobals();
  }, []);

  const bindToSurvey = useCallback((survey: SurveyModel) => {
    if (!survey) {
      return;
    }

    return bindBlindSearchToSurvey(survey);
  }, []);

  const bindToCreator = useCallback((creator: SurveyCreatorModel) => {
    if (!creator) {
      return;
    }

    return bindBlindSearchToCreator(creator);
  }, []);

  return {
    initGlobals,
    bindToSurvey,
    bindToCreator,
  };
}
