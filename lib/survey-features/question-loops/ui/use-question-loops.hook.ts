import { useCallback, useRef } from "react";
import { SurveyModel } from "survey-core";
import {
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import { registerQuestionLoopsGlobals } from "../infrastructure/registry";
import { bindFeatureToSurvey } from "../infrastructure/survey-bindings";

interface QuestionLoopInstallApi {
  /**
   * Registers globals (Serializer, FunctionFactory). Call once before creating any SurveyModel or SurveyCreator.
   */
  initGlobals: () => void;

  /**
   * Binds the question loops feature to a survey model.
   * @param survey - The survey model to bind the question loops feature to.
   * @returns A function to clean up the question loops feature from the survey model.
   */
  bindToSurvey: (survey: SurveyModel) => (() => void) | undefined;

  /**
   * Binds the question loops feature to a survey creator.
   * @param creator - The survey creator to bind the question loops feature to.
   * @returns A function to clean up the question loops feature from the survey creator.
   */
  bindToCreator: (creator: SurveyCreatorModel) => (() => void) | undefined;
}

export function useQuestionLoops(): QuestionLoopInstallApi {
  const isSurveyInitializedRef = useRef(false);
  const isCreatorInitializedRef = useRef(false);
  const creatorCleanupsRef = useRef<(() => void)[]>([]);

  const initGlobals = useCallback(() => {
    registerQuestionLoopsGlobals();
  }, []);

  const bindToSurvey = useCallback((survey: SurveyModel) => {
    if (!survey || isSurveyInitializedRef.current) {
      return;
    }

    isSurveyInitializedRef.current = true;
    const unbind = bindFeatureToSurvey(survey);

    return () => {
      unbind();
      isSurveyInitializedRef.current = false;
    };
  }, []);

  const bindToCreator = useCallback((creator: SurveyCreatorModel) => {
    if (!creator || isCreatorInitializedRef.current) {
      return;
    }

    isCreatorInitializedRef.current = true;
    creatorCleanupsRef.current = [];

    const handleSurveyInstanceCreated = (
      _: unknown,
      options: SurveyInstanceCreatedEvent,
    ) => {
      if (options.area === "property-grid") {
        return;
      }

      const unbindSurvey = bindFeatureToSurvey(options.survey);
      creatorCleanupsRef.current.push(unbindSurvey);
    };

    creator.onSurveyInstanceCreated.add(handleSurveyInstanceCreated);

    return () => {
      creator.onSurveyInstanceCreated.remove(handleSurveyInstanceCreated);
      creatorCleanupsRef.current.forEach((fn) => fn());
      creatorCleanupsRef.current = [];
      isCreatorInitializedRef.current = false;
    };
  }, []);

  return {
    initGlobals,
    bindToSurvey,
    bindToCreator,
  };
}
