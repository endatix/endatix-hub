"use client";

import { SubmissionDetailsResult } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import {
  createContext,
  ReactNode,
  use,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import { Model } from "survey-core";
import z from "zod";
import {
  SubmissionDetailsActionType,
  submissionDetailsReducer,
  SubmissionDetailsState,
} from "./submission-details.reducer";

export const ViewOption = {
  ShowInvisible: "showInvisibleItems",
  ShowPersonalized: "showPersonalizedItems",
  ShowReadOnly: "showReadOnly",
  UseSubmissionLanguage: "useSubmissionLanguage",
} as const;

export type ViewOptionKey = (typeof ViewOption)[keyof typeof ViewOption];

export const viewOptionsStateSchema = z.object({
  [ViewOption.ShowInvisible]: z.boolean(),
  [ViewOption.ShowPersonalized]: z.boolean(),
  [ViewOption.ShowReadOnly]: z.boolean(),
  [ViewOption.UseSubmissionLanguage]: z.boolean().optional(),
});

export type SubmissionDetailsViewOptions = z.infer<
  typeof viewOptionsStateSchema
>;

/**
 * The context type for the submission details context.
 */
interface SubmissionDetailsContextType {
  submission: Submission;

  surveyModel: Model | null;
  setSurveyModel: (model: Model | null) => void;

  viewOptions: SubmissionDetailsViewOptions;
  updateViewOption: <K extends keyof SubmissionDetailsViewOptions>(
    key: K,
    value: SubmissionDetailsViewOptions[K],
  ) => void;
  toggleViewOption: <K extends keyof SubmissionDetailsViewOptions>(
    key: K,
  ) => void;
  resetViewOptions: () => void;

  highlightedQuestionName: string | null;
  setHighlightedQuestionName: (name: string | null) => void;
}

const SubmissionDetailsContext = createContext<
  SubmissionDetailsContextType | undefined
>(undefined);

// ============================================================================
// Constants & Defaults
// ============================================================================

const LOCAL_STORAGE_KEY = "SubmissionDetailsViewOptions";

const DEFAULT_VIEW_OPTIONS: SubmissionDetailsViewOptions = {
  showInvisibleItems: true,
  showPersonalizedItems: true,
  showReadOnly: true,
  useSubmissionLanguage: true,
};

const INITIAL_STATE: SubmissionDetailsState = {
  viewOptions: DEFAULT_VIEW_OPTIONS,
  surveyModel: null,
  highlightedQuestionName: null,
};

interface SubmissionDetailsProviderProps {
  children: ReactNode;
  submissionPromise: Promise<SubmissionDetailsResult | null>;
}

export function SubmissionDetailsProvider({
  children,
  submissionPromise,
}: Readonly<SubmissionDetailsProviderProps>) {
  const result = use(submissionPromise);
  const [state, dispatch] = useReducer(submissionDetailsReducer, INITIAL_STATE);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const resultSchema = viewOptionsStateSchema.safeParse(parsed);
      if (resultSchema.success) {
        dispatch({
          type: SubmissionDetailsActionType.INIT_VIEW_OPTIONS,
          payload: { ...DEFAULT_VIEW_OPTIONS, ...resultSchema.data },
        });
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state.viewOptions));
  }, [state.viewOptions]);

  const submission =
    result && Result.isSuccess(result) ? result.value : undefined;

  const contextValue = useMemo(() => {
    if (!submission) {
      return undefined;
    }

    const setSurveyModel = (model: Model | null) => {
      dispatch({
        type: SubmissionDetailsActionType.SET_SURVEY_MODEL,
        payload: model,
      });
    };

    const updateViewOption = <K extends keyof SubmissionDetailsViewOptions>(
      key: K,
      value: SubmissionDetailsViewOptions[K],
    ) => {
      dispatch({
        type: SubmissionDetailsActionType.UPDATE_VIEW_OPTION,
        payload: { key, value },
      });
    };

    const toggleViewOption = <K extends keyof SubmissionDetailsViewOptions>(
      key: K,
    ) => {
      dispatch({
        type: SubmissionDetailsActionType.TOGGLE_VIEW_OPTION,
        payload: key,
      });
    };

    const resetViewOptions = () =>
      dispatch({
        type: SubmissionDetailsActionType.RESET_VIEW_OPTIONS,
        payload: DEFAULT_VIEW_OPTIONS,
      });

    const setHighlightedQuestionName = (name: string | null) => {
      dispatch({
        type: SubmissionDetailsActionType.SET_HIGHLIGHTED_QUESTION,
        payload: name,
      });
    };

    return {
      submission,
      viewOptions: state.viewOptions,
      updateViewOption,
      toggleViewOption,
      resetViewOptions,
      surveyModel: state.surveyModel,
      setSurveyModel,
      highlightedQuestionName: state.highlightedQuestionName,
      setHighlightedQuestionName,
    };
  }, [submission, state]);

  if (!contextValue) {
    return null;
  }

  return (
    <SubmissionDetailsContext value={contextValue}>
      {children}
    </SubmissionDetailsContext>
  );
}

function useSubmissionDetailsContext() {
  const context = useContext(SubmissionDetailsContext);
  if (context === undefined) {
    throw new Error(
      "useSubmissionDetails hooks must be used within SubmissionDetailsProvider",
    );
  }
  return context;
}

/**
 * Hook to get the submission details view options.
 */
export function useSubmissionDetailsViewOptions() {
  const {
    viewOptions: options,
    updateViewOption: updateOption,
    toggleViewOption: toggleOption,
    resetViewOptions: resetOptions,
  } = useSubmissionDetailsContext();
  return { options, updateOption, toggleOption, resetOptions };
}

/**
 * Hook to get the submission details context. Focuse on the submission details data and actions.
 */
export function useSubmissionDetails() {
  const {
    submission,
    surveyModel,
    setSurveyModel,
    highlightedQuestionName,
    setHighlightedQuestionName,
  } = useSubmissionDetailsContext();
  return {
    submission,
    surveyModel,
    setSurveyModel,
    highlightedQuestionName,
    setHighlightedQuestionName,
  };
}
