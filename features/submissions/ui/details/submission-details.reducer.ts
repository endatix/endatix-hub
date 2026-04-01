import { Model } from "survey-core";
import { SubmissionDetailsViewOptions } from "./submission-details-context";

export enum SubmissionDetailsActionType {
  INIT_VIEW_OPTIONS = "INIT_VIEW_OPTIONS",
  UPDATE_VIEW_OPTION = "UPDATE_VIEW_OPTION",
  TOGGLE_VIEW_OPTION = "TOGGLE_VIEW_OPTION",
  RESET_VIEW_OPTIONS = "RESET_VIEW_OPTIONS",
  SET_SURVEY_MODEL = "SET_SURVEY_MODEL",
  SET_HIGHLIGHTED_QUESTION = "SET_HIGHLIGHTED_QUESTION",
}

export type SubmissionDetailsAction =
  | {
      type: SubmissionDetailsActionType.INIT_VIEW_OPTIONS;
      payload: SubmissionDetailsViewOptions;
    }
  | {
      type: SubmissionDetailsActionType.UPDATE_VIEW_OPTION;
      payload: {
        key: keyof SubmissionDetailsViewOptions;
        value: SubmissionDetailsViewOptions[keyof SubmissionDetailsViewOptions];
      };
    }
  | {
      type: SubmissionDetailsActionType.TOGGLE_VIEW_OPTION;
      payload: keyof SubmissionDetailsViewOptions;
    }
  | {
      type: SubmissionDetailsActionType.RESET_VIEW_OPTIONS;
      payload: SubmissionDetailsViewOptions;
    }
  | {
      type: SubmissionDetailsActionType.SET_SURVEY_MODEL;
      payload: Model | null;
    }
  | {
      type: SubmissionDetailsActionType.SET_HIGHLIGHTED_QUESTION;
      payload: string | null;
    };

export interface SubmissionDetailsState {
  viewOptions: SubmissionDetailsViewOptions;
  surveyModel: Model | null;
  highlightedQuestionName: string | null;
}

/**
 * Reducer for the submission details state
 * @param state - The current state
 * @param action - The action to perform
 * @returns The new state
 */
export function submissionDetailsReducer(
  state: SubmissionDetailsState,
  action: SubmissionDetailsAction,
): SubmissionDetailsState {
  switch (action.type) {
    case SubmissionDetailsActionType.INIT_VIEW_OPTIONS:
    case SubmissionDetailsActionType.RESET_VIEW_OPTIONS:
      return {
        ...state,
        viewOptions: action.payload,
      };
    case SubmissionDetailsActionType.UPDATE_VIEW_OPTION:
      return {
        ...state,
        viewOptions: {
          ...state.viewOptions,
          [action.payload.key]: action.payload.value,
        },
      };
    case SubmissionDetailsActionType.TOGGLE_VIEW_OPTION:
      return {
        ...state,
        viewOptions: {
          ...state.viewOptions,
          [action.payload]: !state.viewOptions[action.payload],
        },
      };
    case SubmissionDetailsActionType.SET_SURVEY_MODEL:
      return {
        ...state,
        surveyModel: action.payload,
      };
    case SubmissionDetailsActionType.SET_HIGHLIGHTED_QUESTION:
      return {
        ...state,
        highlightedQuestionName: action.payload,
      };
    default:
      return state;
  }
}
