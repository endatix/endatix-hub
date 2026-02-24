import { describe, expect, it } from "vitest";
import {
  getSurveyDesignStatus,
  SurveyDesignStatus,
} from "../survey-design-status";

const baseInput = {
  hasJsonErrors: false,
  isOnJsonTab: false,
  isJsonModified: false,
  hasUnsavedChanges: false,
};

describe("getSurveyDesignStatus", () => {
  describe("priority order", () => {
    it("returns InvalidJson when hasJsonErrors is true (highest priority)", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          hasJsonErrors: true,
          isSaving: true,
          showSavedSuccess: true,
        }),
      ).toBe(SurveyDesignStatus.InvalidJson);
    });

    it("returns JsonModified when isJsonModified and isOnJsonTab", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          isJsonModified: true,
          isOnJsonTab: true,
        }),
      ).toBe(SurveyDesignStatus.JsonModified);
    });

    it("returns UnsavedChanges when hasUnsavedChanges and not on JSON tab", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          hasUnsavedChanges: true,
          isOnJsonTab: false,
        }),
      ).toBe(SurveyDesignStatus.UnsavedChanges);
    });

    it("returns SaveInProgress when isSaving", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          isSaving: true,
        }),
      ).toBe(SurveyDesignStatus.SaveInProgress);
    });

    it("returns Saved when showSavedSuccess (and not saving)", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          showSavedSuccess: true,
        }),
      ).toBe(SurveyDesignStatus.Saved);
    });

    it("returns NoChanges when all flags false", () => {
      expect(getSurveyDesignStatus(baseInput)).toBe(
        SurveyDesignStatus.NoChanges,
      );
    });
  });

  describe("edge cases", () => {
    it("InvalidJson wins over isSaving (show error, not saving state)", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          hasJsonErrors: true,
          isSaving: true,
        }),
      ).toBe(SurveyDesignStatus.InvalidJson);
    });

    it("JsonModified only when on JSON tab", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          isJsonModified: true,
          isOnJsonTab: false,
        }),
      ).toBe(SurveyDesignStatus.NoChanges);
    });

    it("UnsavedChanges only when not on JSON tab", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          hasUnsavedChanges: true,
          isOnJsonTab: true,
        }),
      ).toBe(SurveyDesignStatus.NoChanges);
    });

    it("isSaving wins over showSavedSuccess (saving takes precedence)", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          isSaving: true,
          showSavedSuccess: true,
        }),
      ).toBe(SurveyDesignStatus.SaveInProgress);
    });

    it("defaults isSaving and showSavedSuccess to false", () => {
      expect(getSurveyDesignStatus({ ...baseInput })).toBe(
        SurveyDesignStatus.NoChanges,
      );
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          isSaving: undefined,
          showSavedSuccess: undefined,
        }),
      ).toBe(SurveyDesignStatus.NoChanges);
    });

    it("on JSON tab with unsaved designer changes but no JSON edit shows NoChanges", () => {
      expect(
        getSurveyDesignStatus({
          ...baseInput,
          isOnJsonTab: true,
          hasUnsavedChanges: true,
          isJsonModified: false,
        }),
      ).toBe(SurveyDesignStatus.NoChanges);
    });
  });
});
