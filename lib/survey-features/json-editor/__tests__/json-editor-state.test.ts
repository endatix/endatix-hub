import { describe, expect, it } from "vitest";
import {
  createOnJsonTabState,
  JSON_EDITOR_PLUGIN_NAME,
  JSON_EDITOR_PROPERTY_NAMES,
  NOT_ON_JSON_TAB_STATE,
} from "../json-editor-state";

describe("json-editor-state", () => {
  describe("NOT_ON_JSON_TAB_STATE", () => {
    it("should have isOnJsonTab false and all flags false", () => {
      // Assert
      expect(NOT_ON_JSON_TAB_STATE).toEqual({
        hasErrors: false,
        isOnJsonTab: false,
        isJsonModified: false,
      });
    });
  });

  describe("createOnJsonTabState", () => {
    it("should return state with isOnJsonTab true and defaults when no overrides", () => {
      // Act
      const state = createOnJsonTabState({});

      // Assert
      expect(state).toEqual({
        hasErrors: false,
        isOnJsonTab: true,
        isJsonModified: false,
      });
    });

    it("should merge overrides onto default on-json-tab state", () => {
      // Act
      const state = createOnJsonTabState({
        hasErrors: true,
        isJsonModified: true,
      });

      // Assert
      expect(state).toEqual({
        hasErrors: true,
        isOnJsonTab: true,
        isJsonModified: true,
      });
    });

    it("should allow partial overrides", () => {
      // Act
      const state = createOnJsonTabState({ hasErrors: true });

      // Assert
      expect(state.hasErrors).toBe(true);
      expect(state.isOnJsonTab).toBe(true);
      expect(state.isJsonModified).toBe(false);
    });
  });

  describe("constants", () => {
    it('should export JSON_EDITOR_PLUGIN_NAME as "json"', () => {
      expect(JSON_EDITOR_PLUGIN_NAME).toBe("json");
    });

    it("should export JSON_EDITOR_PROPERTY_NAMES with hasErrors and aceCanUndo", () => {
      expect(JSON_EDITOR_PROPERTY_NAMES).toEqual({
        hasErrors: "hasErrors",
        aceCanUndo: "aceCanUndo",
      });
    });
  });
});
