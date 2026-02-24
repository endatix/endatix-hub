import { describe, expect, it } from "vitest";
import {
  JSON_EDITOR_PROPERTY_NAMES,
  NOT_ON_JSON_TAB_STATE,
  createOnJsonTabState,
  computeStateAfterPropertyChange,
} from "../json-editor-state";

const baseInput = {
  hasErrorsFromModel: false,
  isJsonModifiedCurrent: false,
  isJsonTextDifferent: false,
  fileJustImported: false,
};

describe("json-editor-state", () => {
  describe("NOT_ON_JSON_TAB_STATE", () => {
    it("has all flags false", () => {
      expect(NOT_ON_JSON_TAB_STATE).toEqual({
        hasErrors: false,
        isOnJsonTab: false,
        isJsonModified: false,
      });
    });
  });

  describe("createOnJsonTabState", () => {
    it("defaults to isOnJsonTab true and others false", () => {
      expect(createOnJsonTabState({})).toEqual({
        hasErrors: false,
        isOnJsonTab: true,
        isJsonModified: false,
      });
    });

    it("applies overrides", () => {
      expect(
        createOnJsonTabState({ hasErrors: true, isJsonModified: true }),
      ).toEqual({
        hasErrors: true,
        isOnJsonTab: true,
        isJsonModified: true,
      });
    });
  });

  describe("computeStateAfterPropertyChange", () => {
    it("returns state when hasErrors property changes", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        propertyName: JSON_EDITOR_PROPERTY_NAMES.hasErrors,
        newValue: true,
      });
      expect(result).toMatchObject({
        hasErrors: true,
        isOnJsonTab: true,
      });
    });

    it("returns state when hasErrors becomes false", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        hasErrorsFromModel: true,
        propertyName: JSON_EDITOR_PROPERTY_NAMES.hasErrors,
        newValue: false,
      });
      expect(result).toMatchObject({
        hasErrors: false,
        isOnJsonTab: true,
      });
    });

    it("returns state with isJsonModified true when isJsonTextDifferent is true and differs from isJsonModifiedCurrent", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        isJsonModifiedCurrent: false,
        isJsonTextDifferent: true,
        propertyName: "other",
        newValue: undefined,
      });
      expect(result).toEqual(
        createOnJsonTabState({ hasErrors: false, isJsonModified: true }),
      );
    });

    it("returns state with isJsonModified false when isJsonTextDifferent is false and differs from isJsonModifiedCurrent", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        isJsonModifiedCurrent: true,
        isJsonTextDifferent: false,
        propertyName: "other",
        newValue: undefined,
      });
      expect(result).toEqual(
        createOnJsonTabState({ hasErrors: false, isJsonModified: false }),
      );
    });

    it("notifies when isJsonTextDifferent equals isJsonModifiedCurrent and no hasErrors change (isJsonModifiedNew undefined)", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        isJsonModifiedCurrent: false,
        isJsonTextDifferent: false,
        propertyName: "other",
        newValue: undefined,
      });
      // Implementation: isJsonModifiedNew is never set, so undefined !== isJsonModifiedCurrent triggers notify
      expect(result).toMatchObject({
        hasErrors: false,
        isOnJsonTab: true,
      });
      expect(result?.isJsonModified).toBeUndefined();
    });

    it("returns state with isJsonModified true when fileJustImported is true and isJsonModifiedCurrent is false", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        fileJustImported: true,
        propertyName: "other",
        newValue: undefined,
      });
      expect(result).toEqual(
        createOnJsonTabState({ hasErrors: false, isJsonModified: true }),
      );
    });

    it("notifies for unknown property when fileJustImported is false and isJsonTextDifferent equals isJsonModifiedCurrent (isJsonModifiedNew undefined)", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        propertyName: "unknown",
        newValue: 123,
      });
      // Implementation: isJsonModifiedNew is never set, so undefined !== isJsonModifiedCurrent triggers notify
      expect(result).toMatchObject({
        hasErrors: false,
        isOnJsonTab: true,
      });
      expect(result?.isJsonModified).toBeUndefined();
    });

    it("combines hasErrors and isJsonModified when both trigger", () => {
      const result = computeStateAfterPropertyChange({
        ...baseInput,
        hasErrorsFromModel: false,
        fileJustImported: true,
        propertyName: JSON_EDITOR_PROPERTY_NAMES.hasErrors,
        newValue: true,
      });
      expect(result).toEqual(
        createOnJsonTabState({ hasErrors: true, isJsonModified: true }),
      );
    });
  });
});
