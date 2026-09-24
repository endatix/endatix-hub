"use client";

import { SubmissionDetailsResult } from "@/features/submissions/use-cases/get-submission-details.use-case";
import { Submission } from "@/lib/endatix-api";
import {
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  getSubmissionLocale,
  isLocaleValid,
  toCatalogLocales,
  toSurveyModelLocale,
} from "@/lib/localization";
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
import { Model, Question } from "survey-core";
import z from "zod";
import {
  buildSubmissionNavPages,
  SubmissionNavPage,
} from "./submission-details-nav";
import {
  SubmissionDetailsActionType,
  submissionDetailsReducer,
  SubmissionDetailsState,
} from "./submission-details.reducer";
import {
  clearSubmissionDisplayLocale,
  publishSubmissionDisplayLocale,
} from "./submission-display-locale.store";

export const ViewOption = {
  ShowInvisible: "showInvisibleItems",
  ShowPersonalized: "showPersonalizedItems",
  ShowReadOnly: "showReadOnly",
} as const;

export type ViewOptionKey = (typeof ViewOption)[keyof typeof ViewOption];

export const viewOptionsStateSchema = z.object({
  [ViewOption.ShowInvisible]: z.boolean(),
  [ViewOption.ShowPersonalized]: z.boolean(),
  [ViewOption.ShowReadOnly]: z.boolean(),
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
  /**
   * Catalog locale for SurveyJS labels on this page.
   * Does not change the submission's stored language.
   */
  displayCatalogLocale: string;
  setDisplayCatalogLocale: (catalogLocale: string) => void;
  /** Stored submission language, or `default` when the survey lacks it. */
  submittedCatalogLocale: string;
  catalogLocales: string[];
  allQuestions: Question[];
  submissionNavPages: SubmissionNavPage[];
  viewOptions: SubmissionDetailsViewOptions;
  updateViewOption: (key: ViewOptionKey, value: boolean) => void;
  toggleViewOption: (key: ViewOptionKey) => void;
  resetViewOptions: () => void;
  highlightedQuestionName: string | null;
  setHighlightedQuestionName: (name: string | null) => void;
}

const SubmissionDetailsContext = createContext<
  SubmissionDetailsContextType | undefined
>(undefined);

const LOCAL_STORAGE_KEY = "SubmissionDetailsViewOptions";

const DEFAULT_VIEW_OPTIONS: SubmissionDetailsViewOptions = {
  [ViewOption.ShowInvisible]: true,
  [ViewOption.ShowPersonalized]: true,
  [ViewOption.ShowReadOnly]: true,
};

const DEFAULT_STATE: SubmissionDetailsState = {
  viewOptions: DEFAULT_VIEW_OPTIONS,
  surveyModel: null,
  displayCatalogLocale: DEFAULT_CATALOG_LOCALE,
  highlightedQuestionName: null,
};

function submittedCatalogLocaleOf(
  submission: Submission,
  model: Model,
): string {
  const locale = getSubmissionLocale(submission);
  return isLocaleValid(locale, model)
    ? fromSurveyModelLocale(locale)
    : DEFAULT_CATALOG_LOCALE;
}

export function getStoredViewOptions(): SubmissionDetailsViewOptions | null {
  if (globalThis.window === undefined) {
    return null;
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    const resultSchema = viewOptionsStateSchema.safeParse(parsed);
    if (resultSchema.success) {
      return {
        ...DEFAULT_VIEW_OPTIONS,
        ...resultSchema.data,
      };
    }
  } catch {
    // ignore parse errors
  }

  return null;
}

interface SubmissionDetailsProviderProps {
  children: ReactNode;
  submissionPromise: Promise<SubmissionDetailsResult | null>;
}

export function SubmissionDetailsProvider({
  children,
  submissionPromise,
}: Readonly<SubmissionDetailsProviderProps>) {
  const result = use(submissionPromise);
  const [state, dispatch] = useReducer(submissionDetailsReducer, DEFAULT_STATE);

  useEffect(() => {
    const storedViewOptions = getStoredViewOptions();
    if (storedViewOptions) {
      dispatch({
        type: SubmissionDetailsActionType.INIT_VIEW_OPTIONS,
        payload: storedViewOptions,
      });
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
  const submissionId = submission?.id;

  const allQuestions = useMemo(() => {
    if (!state.surveyModel) {
      return [];
    }

    return state.surveyModel.getAllQuestions(false, false, false);
  }, [state.surveyModel]);

  const submissionNavPages = useMemo(() => {
    return buildSubmissionNavPages(
      state.surveyModel,
      state.viewOptions.showInvisibleItems,
    );
    // Page titles are read from the model, so a locale switch must rebuild them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.surveyModel,
    state.viewOptions.showInvisibleItems,
    state.displayCatalogLocale,
  ]);

  const catalogLocales = useMemo(
    () =>
      state.surveyModel
        ? toCatalogLocales(state.surveyModel.getUsedLocales() ?? [])
        : [],
    [state.surveyModel],
  );

  const submittedCatalogLocale = useMemo(() => {
    if (!submission || !state.surveyModel) {
      return DEFAULT_CATALOG_LOCALE;
    }

    return submittedCatalogLocaleOf(submission, state.surveyModel);
  }, [submission, state.surveyModel]);

  useEffect(() => {
    if (!submissionId || catalogLocales.length === 0) {
      return;
    }

    publishSubmissionDisplayLocale(submissionId, {
      catalogLocales,
      displayCatalogLocale: state.displayCatalogLocale,
    });
    return () => clearSubmissionDisplayLocale(submissionId);
  }, [submissionId, catalogLocales, state.displayCatalogLocale]);

  const contextValue = useMemo(() => {
    if (!submission) {
      return undefined;
    }

    const setSurveyModel = (model: Model | null) => {
      // Callers re-run this on every context change; re-applying would reset the chosen locale.
      if (model === state.surveyModel) {
        return;
      }

      if (model) {
        const catalogLocale = submittedCatalogLocaleOf(submission, model);
        model.locale = toSurveyModelLocale(catalogLocale);
        dispatch({
          type: SubmissionDetailsActionType.SET_DISPLAY_CATALOG_LOCALE,
          payload: catalogLocale,
        });
      }
      dispatch({
        type: SubmissionDetailsActionType.SET_SURVEY_MODEL,
        payload: model,
      });
    };

    const setDisplayCatalogLocale = (catalogLocale: string) => {
      if (!state.surveyModel || !catalogLocales.includes(catalogLocale)) {
        return;
      }

      state.surveyModel.locale = toSurveyModelLocale(catalogLocale);
      dispatch({
        type: SubmissionDetailsActionType.SET_DISPLAY_CATALOG_LOCALE,
        payload: catalogLocale,
      });
    };

    const updateViewOption = (key: ViewOptionKey, value: boolean) => {
      dispatch({
        type: SubmissionDetailsActionType.UPDATE_VIEW_OPTION,
        payload: { key, value },
      });
    };

    const toggleViewOption = (key: ViewOptionKey) => {
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
      displayCatalogLocale: state.displayCatalogLocale,
      setDisplayCatalogLocale,
      submittedCatalogLocale,
      catalogLocales,
      allQuestions,
      submissionNavPages,
      highlightedQuestionName: state.highlightedQuestionName,
      setHighlightedQuestionName,
    };
  }, [
    submission,
    state.viewOptions,
    state.surveyModel,
    state.displayCatalogLocale,
    state.highlightedQuestionName,
    submittedCatalogLocale,
    catalogLocales,
    allQuestions,
    submissionNavPages,
  ]);

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
    viewOptions,
    updateViewOption: updateOption,
    toggleViewOption: toggleOption,
    resetViewOptions: resetOptions,
  } = useSubmissionDetailsContext();
  return { viewOptions, updateOption, toggleOption, resetOptions };
}

/**
 * Hook to get the submission details context. Focused on the submission details data and actions.
 */
export function useSubmissionDetails() {
  const {
    submission,
    surveyModel,
    allQuestions,
    submissionNavPages,
    setSurveyModel,
    displayCatalogLocale,
    setDisplayCatalogLocale,
    submittedCatalogLocale,
    catalogLocales,
    highlightedQuestionName,
    setHighlightedQuestionName,
  } = useSubmissionDetailsContext();
  return {
    submission,
    surveyModel,
    allQuestions,
    submissionNavPages,
    setSurveyModel,
    displayCatalogLocale,
    setDisplayCatalogLocale,
    submittedCatalogLocale,
    catalogLocales,
    highlightedQuestionName,
    setHighlightedQuestionName,
  };
}
