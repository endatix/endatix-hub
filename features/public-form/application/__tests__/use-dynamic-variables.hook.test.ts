import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import {
  applyVariablesToModel,
  useDynamicVariables,
} from "../use-dynamic-variables.hook";
import { MetadataSchema } from "../../types";

describe("applyVariablesToModel", () => {
  let model: SurveyModel;

  beforeEach(() => {
    model = new SurveyModel();
    vi.clearAllMocks();
  });

  describe("Valid Metadata", () => {
    it("should apply variables from valid metadata", () => {
      // Arrange
      const metadata = JSON.stringify({
        variables: {
          var1: "value1",
          var2: 42,
          var3: true,
        },
      });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariable("var1")).toBe("value1");
      expect(model.getVariable("var2")).toBe(42);
      expect(model.getVariable("var3")).toBe(true);
    });

    it("should handle empty variables object", () => {
      // Arrange
      const metadata = JSON.stringify({ variables: {} });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariableNames().length).toBe(0);
    });

    it("should handle metadata with only language (no variables)", () => {
      // Arrange
      const metadata = JSON.stringify({ language: "en" });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariableNames().length).toBe(0);
    });

    it("should handle complex variable types", () => {
      // Arrange
      const metadata = JSON.stringify({
        variables: {
          stringVar: "text",
          numberVar: 123,
          booleanVar: false,
          objectVar: { nested: "value" },
        },
      });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariable("stringVar")).toBe("text");
      expect(model.getVariable("numberVar")).toBe(123);
      expect(model.getVariable("booleanVar")).toBe(false);
      expect(model.getVariable("objectVar")).toEqual({ nested: "value" });
    });

    it("should overwrite existing variables", () => {
      // Arrange
      model.setVariable("existing", "old");
      const metadata = JSON.stringify({
        variables: { existing: "new" },
      });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariable("existing")).toBe("new");
    });
  });

  describe("Invalid Metadata", () => {
    it("should not throw when metadata is empty string", () => {
      // Act & Assert
      expect(() => applyVariablesToModel(model, "")).not.toThrow();
      expect(model.getVariableNames().length).toBe(0);
    });

    it("should not throw when metadata is null", () => {
      // Act & Assert
      expect(() =>
        applyVariablesToModel(model, null as unknown as string),
      ).not.toThrow();
    });

    it("should handle invalid JSON", () => {
      // Arrange
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const invalidJson = "{ invalid json }";

      // Act
      applyVariablesToModel(model, invalidJson);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Invalid variables in metadata:",
        expect.any(Error),
      );
      expect(model.getVariableNames().length).toBe(0);
      consoleErrorSpy.mockRestore();
    });

    it("should handle metadata that doesn't match schema", () => {
      // Arrange
      const invalidMetadata = JSON.stringify({ notVariables: "value" });
      const parseSpy = vi.spyOn(MetadataSchema, "safeParse");

      // Act
      applyVariablesToModel(model, invalidMetadata);

      // Assert
      expect(parseSpy).toHaveBeenCalled();
      expect(model.getVariableNames().length).toBe(0);
      parseSpy.mockRestore();
    });

    it("should handle metadata with invalid variable types", () => {
      // Arrange

      const metadataWithUndefined = JSON.stringify({
        variables: {
          valid: "string",
          undefinedVar: undefined, // undefined IS in DynamicVariableSchema
        },
      });

      // Act
      applyVariablesToModel(model, metadataWithUndefined);

      // Assert
      expect(model.getVariable("valid")).toBe("string");
      expect(model.getVariable("undefinedVar")).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined variable values", () => {
      // Arrange
      const metadata = JSON.stringify({
        variables: {
          undefinedVar: undefined,
        },
      });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariable("undefinedVar")).toBeUndefined();
    });

    it("should handle very large variable objects", () => {
      // Arrange
      const largeVars: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeVars[`var${i}`] = `value${i}`;
      }
      const metadata = JSON.stringify({ variables: largeVars });

      // Act
      applyVariablesToModel(model, metadata);

      // Assert
      expect(model.getVariableNames().length).toBe(1000);
      expect(model.getVariable("var500")).toBe("value500");
    });
  });
});

describe("useDynamicVariables", () => {
  let model: SurveyModel;
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  beforeEach(() => {
    model = new SurveyModel();
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  describe("Initial State", () => {
    it("should return empty variables when model is null", () => {
      // Act
      const { result } = renderHook(() => useDynamicVariables(null));

      // Assert
      expect(result.current.variables).toEqual({});
    });

    it("should return empty variables when model is undefined", () => {
      // Act
      const { result } = renderHook(() =>
        useDynamicVariables(undefined as unknown as SurveyModel),
      );

      // Assert
      expect(result.current.variables).toEqual({});
    });

    it("should sync initial variables from model", () => {
      // Arrange
      model.setVariable("var1", "value1");
      model.setVariable("var2", 42);

      // Act
      const { result } = renderHook(() => useDynamicVariables(model));

      // Assert
      expect(result.current.variables).toEqual({
        var1: "value1",
        var2: 42,
      });
    });
  });

  describe("Variable Change Subscription", () => {
    it("should update variables when model variable changes", async () => {
      // Arrange
      const { result } = renderHook(() => useDynamicVariables(model));

      // Act
      act(() => {
        model.setVariable("newvar", "newValue");
      });

      // Assert
      // Wait for the event to propagate and React state to update
      await waitFor(() => {
        expect(result.current.variables).toHaveProperty("newvar", "newValue");
      });
    });

    it("should update variables when multiple variables change", async () => {
      // Arrange
      const { result } = renderHook(() => useDynamicVariables(model));

      // Act
      act(() => {
        model.setVariable("var1", "value1");
        model.setVariable("var2", "value2");
      });

      // Assert
      await expect(result.current.variables).toHaveProperty("var1", "value1");
      await expect(result.current.variables).toHaveProperty("var2", "value2");
    });

    it("should update when variable is removed", async () => {
      // Arrange
      model.setVariable("var1", "value1");
      const { result } = renderHook(() => useDynamicVariables(model));

      // Wait for initial sync
      await waitFor(() => {
        expect(result.current.variables).toHaveProperty("var1", "value1");
      });

      // Act
      act(() => {
        model.setVariable("var1", undefined);
      });

      // Assert
      await waitFor(() => {
        expect(result.current.variables).toHaveProperty("var1", undefined);
      });
    });

    it("should handle rapid variable changes", async () => {
      // Arrange
      const { result } = renderHook(() => useDynamicVariables(model));

      // Act
      act(() => {
        for (let i = 0; i < 10; i++) {
          model.setVariable(`var${i}`, `value${i}`);
        }
      });

      // Assert
      await expect(Object.keys(result.current.variables).length).toBe(10);
    });
  });

  describe("Model Changes", () => {
    it("should reset variables when model changes to null", async () => {
      // Arrange
      const { result, rerender } = renderHook(
        (model: SurveyModel | null) => useDynamicVariables(model),
        {
          initialProps: model,
        },
      );

      act(() => {
        model.setVariable("var1", "value1");
      });

      // Wait for initial sync
      await expect(result.current.variables).toHaveProperty("var1");

      // Act
      rerender();

      // Assert
      expect(result.current.variables).toEqual({});
    });

    it("should sync variables when model changes to a new instance", async () => {
      // Arrange
      const { result, rerender } = renderHook(
        (model: SurveyModel | null) => useDynamicVariables(model),
        {
          initialProps: model,
        },
      );

      const newModel = new SurveyModel();
      newModel.setVariable("newvar", "newValue");

      // Act
      rerender(newModel);

      // Assert
      await expect(result.current.variables).toEqual({
        newvar: "newValue",
      });
    });

    it("should unsubscribe from old model and subscribe to new model", async () => {
      // Arrange
      const oldModel = new SurveyModel();
      const { result, rerender } = renderHook(
        (model: SurveyModel | null) => useDynamicVariables(model),
        {
          initialProps: oldModel,
        },
      );

      const newModel = new SurveyModel();

      // Act
      rerender(newModel);

      // Wait for new model to sync
      await expect(result.current.variables).toEqual({});

      // Changes to old model should not trigger updates in the hook
      act(() => {
        oldModel.setVariable("oldvar", "oldValue");
      });

      // Assert
      await expect(result.current.variables).not.toHaveProperty("oldvar");
    });
  });

  describe("Cleanup", () => {
    it("should cleanup event listener on unmount", () => {
      // Arrange
      const removeSpy = vi.spyOn(model.onVariableChanged, "remove");
      const { unmount } = renderHook(() => useDynamicVariables(model));

      // Act
      unmount();

      // Assert
      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it("should cleanup and re-subscribe when model changes", () => {
      // Arrange
      const oldModel = new SurveyModel();
      const removeSpy = vi.spyOn(oldModel.onVariableChanged, "remove");
      const { rerender } = renderHook(
        (model: SurveyModel | null) => useDynamicVariables(model),
        {
          initialProps: oldModel,
        },
      );

      const newModel = new SurveyModel();

      // Act
      rerender(newModel);

      // Assert
      expect(removeSpy).toHaveBeenCalled();
      removeSpy.mockRestore();
    });
  });
});
