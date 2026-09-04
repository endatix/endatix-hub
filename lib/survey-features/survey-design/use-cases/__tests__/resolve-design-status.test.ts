import { describe, expect, it } from "vitest";
import {
  resolveSurveyDesignStatus,
  SurveyDesignStatus,
} from "../resolve-design-status";

const baseInput = {
  hasJsonErrors: false,
  isOnJsonTab: false,
  isJsonModified: false,
  hasUnsavedChanges: false,
};

describe("resolveSurveyDesignStatus", () => {
  describe("priority order", () => {
    it("returns InvalidJson when hasJsonErrors is true (highest priority)", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          hasJsonErrors: true,
          isSaving: true,
          showSavedSuccess: true,
        }),
      ).toBe(SurveyDesignStatus.InvalidJson);
    });

    it("returns JsonModified when isJsonModified and isOnJsonTab", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          isJsonModified: true,
          isOnJsonTab: true,
        }),
      ).toBe(SurveyDesignStatus.JsonModified);
    });

    it("returns UnsavedChanges when hasUnsavedChanges and not on JSON tab", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          hasUnsavedChanges: true,
          isOnJsonTab: false,
        }),
      ).toBe(SurveyDesignStatus.UnsavedChanges);
    });

    it("returns SaveInProgress when isSaving", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          isSaving: true,
        }),
      ).toBe(SurveyDesignStatus.SaveInProgress);
    });

    it("returns Saved when showSavedSuccess (and not saving)", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          showSavedSuccess: true,
        }),
      ).toBe(SurveyDesignStatus.Saved);
    });

    it("returns NoChanges when all flags false", () => {
      expect(resolveSurveyDesignStatus(baseInput)).toBe(
        SurveyDesignStatus.NoChanges,
      );
    });
  });

  describe("edge cases", () => {
    it("InvalidJson wins over isSaving (show error, not saving state)", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          hasJsonErrors: true,
          isSaving: true,
        }),
      ).toBe(SurveyDesignStatus.InvalidJson);
    });

    it("JsonModified only when on JSON tab", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          isJsonModified: true,
          isOnJsonTab: false,
        }),
      ).toBe(SurveyDesignStatus.NoChanges);
    });

    it("UnsavedChanges also when on JSON tab", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          hasUnsavedChanges: true,
          isOnJsonTab: true,
        }),
      ).toBe(SurveyDesignStatus.UnsavedChanges);
    });

    it("isSaving wins over showSavedSuccess (saving takes precedence)", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          isSaving: true,
          showSavedSuccess: true,
        }),
      ).toBe(SurveyDesignStatus.SaveInProgress);
    });

    it("defaults isSaving and showSavedSuccess to false", () => {
      expect(resolveSurveyDesignStatus({ ...baseInput })).toBe(
        SurveyDesignStatus.NoChanges,
      );
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          isSaving: undefined,
          showSavedSuccess: undefined,
        }),
      ).toBe(SurveyDesignStatus.NoChanges);
    });

    it("on JSON tab with unsaved designer changes but no JSON edit shows UnsavedChanges", () => {
      expect(
        resolveSurveyDesignStatus({
          ...baseInput,
          isOnJsonTab: true,
          hasUnsavedChanges: true,
          isJsonModified: false,
        }),
      ).toBe(SurveyDesignStatus.UnsavedChanges);
    });
  });
});
