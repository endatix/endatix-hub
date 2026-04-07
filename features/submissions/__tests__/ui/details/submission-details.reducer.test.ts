import { describe, expect, it } from "vitest";
import {
  SubmissionDetailsAction,
  SubmissionDetailsActionType,
  submissionDetailsReducer,
  type SubmissionDetailsState,
} from "../../../ui/details/submission-details.reducer";

describe("submissionDetailsReducer", () => {
  const initialState: SubmissionDetailsState = {
    viewOptions: {
      showInvisibleItems: true,
      showReadOnly: true,
      useSubmissionLanguage: true,
    },
    surveyModel: null,
    highlightedQuestionName: null,
  };

  describe("INIT_VIEW_OPTIONS", () => {
    it("should replace viewOptions with payload", () => {
      const newOptions = {
        showInvisibleItems: false,
        showReadOnly: false,
        useSubmissionLanguage: false,
      };

      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.INIT_VIEW_OPTIONS,
        payload: newOptions,
      };

      const result = submissionDetailsReducer(initialState, action);

      expect(result.viewOptions).toEqual(newOptions);
      expect(result.surveyModel).toBeNull();
      expect(result.highlightedQuestionName).toBeNull();
    });
  });

  describe("UPDATE_VIEW_OPTION", () => {
    it("should update a single view option", () => {
      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.UPDATE_VIEW_OPTION,
        payload: { key: "showInvisibleItems", value: false },
      };

      const result = submissionDetailsReducer(initialState, action);

      expect(result.viewOptions.showInvisibleItems).toBe(false);
      expect(result.viewOptions.showReadOnly).toBe(true);
      expect(result.viewOptions.useSubmissionLanguage).toBe(true);
    });

    it("should update optional view option", () => {
      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.UPDATE_VIEW_OPTION,
        payload: { key: "showReadOnly", value: false },
      };

      const result = submissionDetailsReducer(initialState, action);

      expect(result.viewOptions.showReadOnly).toBe(false);
    });
  });

  describe("TOGGLE_VIEW_OPTION", () => {
    it("should toggle boolean view option from true to false", () => {
      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.TOGGLE_VIEW_OPTION,
        payload: "showInvisibleItems",
      };

      const result = submissionDetailsReducer(initialState, action);

      expect(result.viewOptions.showInvisibleItems).toBe(false);
    });

    it("should toggle boolean view option from false to true", () => {
      const stateWithFalse = {
        ...initialState,
        viewOptions: { ...initialState.viewOptions, showInvisibleItems: false },
      };

      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.TOGGLE_VIEW_OPTION,
        payload: "showInvisibleItems",
      };

      const result = submissionDetailsReducer(stateWithFalse, action);

      expect(result.viewOptions.showInvisibleItems).toBe(true);
    });
  });

  describe("RESET_VIEW_OPTIONS", () => {
    it("should reset viewOptions to default values", () => {
      const modifiedState: SubmissionDetailsState = {
        ...initialState,
        viewOptions: {
          showInvisibleItems: false,
          showReadOnly: false,
          useSubmissionLanguage: false,
        },
        surveyModel: {} as any,
        highlightedQuestionName: "question1",
      };

      const defaultOptions = {
        showInvisibleItems: true,
        showReadOnly: true,
        useSubmissionLanguage: true,
      };

      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.RESET_VIEW_OPTIONS,
        payload: defaultOptions,
      };

      const result = submissionDetailsReducer(modifiedState, action);

      expect(result.viewOptions).toEqual(defaultOptions);
      expect(result.surveyModel).toBeDefined();
      expect(result.highlightedQuestionName).toBe("question1");
    });
  });

  describe("SET_SURVEY_MODEL", () => {
    it("should set surveyModel to the payload", () => {
      const mockModel = { get: () => {} } as any;

      const action = {
        type: SubmissionDetailsActionType.SET_SURVEY_MODEL,
        payload: mockModel,
      };

      const result = submissionDetailsReducer(initialState, action);

      expect(result.surveyModel).toBe(mockModel);
    });

    it("should set surveyModel to null", () => {
      const stateWithModel = {
        ...initialState,
        surveyModel: { get: () => {} } as any,
      };

      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.SET_SURVEY_MODEL,
        payload: null,
      };

      const result = submissionDetailsReducer(stateWithModel, action);

      expect(result.surveyModel).toBeNull();
    });
  });

  describe("SET_HIGHLIGHTED_QUESTION", () => {
    it("should set highlightedQuestionName to the payload", () => {
      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.SET_HIGHLIGHTED_QUESTION,
        payload: "question1",
      };

      const result = submissionDetailsReducer(initialState, action);

      expect(result.highlightedQuestionName).toBe("question1");
    });

    it("should set highlightedQuestionName to null", () => {
      const stateWithHighlight = {
        ...initialState,
        highlightedQuestionName: "question1",
      };

      const action: SubmissionDetailsAction = {
        type: SubmissionDetailsActionType.SET_HIGHLIGHTED_QUESTION,
        payload: null,
      };

      const result = submissionDetailsReducer(stateWithHighlight, action);

      expect(result.highlightedQuestionName).toBeNull();
    });
  });

  describe("default case", () => {
    it("should return the same state for unknown action type", () => {
      const action = { type: "UNKNOWN_ACTION" } as any;

      const result = submissionDetailsReducer(initialState, action);

      expect(result).toEqual(initialState);
    });
  });
});
