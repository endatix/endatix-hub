import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { TabJsonEditorAcePlugin } from "survey-creator-core";
import {
  NOT_ON_JSON_TAB_STATE,
  createOnJsonTabState,
} from "../json-editor-state";
import { useJsonEditor } from "../use-json-editor.hook";

vi.mock("survey-core", () => ({
  Model: vi.fn().mockImplementation(function (this: any) {
    this.fromJSON = vi.fn();
    this.toJSON = vi.fn().mockReturnValue({ pages: [] });
    this.jsonErrors = [];
    return this;
  }),
}));

vi.mock("survey-creator-core", () => ({
  TabJsonEditorAcePlugin: {
    hasAceEditor: vi.fn().mockReturnValue(false),
  },
}));

describe("useJsonEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getJsonModel", () => {
    it("should return error when creator is null", () => {
      // Arrange
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(null);

      // Assert
      expect(Result.isError(outcome)).toBe(true);
      if (Result.isError(outcome)) {
        expect(outcome.message).toBe(
          "Unexpeted error. Please reload the page and try again.",
        );
      }
    });

    it("should return success with creator.JSON when not on JSON tab", () => {
      // Arrange
      const mockJson = { pages: [{ name: "p1" }] };
      const creator = {
        activeTab: "design",
        JSON: mockJson,
        getPlugin: vi.fn(),
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(creator as any);

      // Assert
      expect(Result.isSuccess(outcome)).toBe(true);
      expect(creator.getPlugin).not.toHaveBeenCalled();
      if (Result.isSuccess(outcome)) {
        expect(outcome.value).toBe(mockJson);
      }
    });

    it("should return error when on JSON tab but plugin is missing", () => {
      // Arrange
      const creator = {
        activeTab: "json",
        JSON: {},
        getPlugin: vi.fn().mockReturnValue(null),
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(creator as any);

      // Assert
      expect(Result.isError(outcome)).toBe(true);
      if (Result.isError(outcome)) {
        expect(outcome.message).toBe(
          "Unexpeted error. Please reload the page and try again.",
        );
      }
    });

    it("should return validation error when plugin model has errors", () => {
      // Arrange
      const creator = {
        activeTab: "json",
        JSON: {},
        getPlugin: vi.fn().mockReturnValue({
          model: { hasErrors: true, text: "{}" },
        }),
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(creator as any);

      // Assert
      expect(Result.isError(outcome)).toBe(true);
      if (Result.isError(outcome)) {
        expect(outcome.message).toBe(
          "Please fix the errors in the JSON schema and try again.",
        );
      }
    });

    it("should return validation error when JSON is malformed", () => {
      // Arrange
      const creator = {
        activeTab: "json",
        JSON: {},
        getPlugin: vi.fn().mockReturnValue({
          model: { hasErrors: false, text: "not valid json {" },
        }),
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(creator as any);

      // Assert
      expect(Result.isError(outcome)).toBe(true);
      if (Result.isError(outcome)) {
        expect(outcome.message).toBe(
          "JSON schema is malformed and cannot be parsed.",
        );
      }
    });

    it("should return validation error when survey model has jsonErrors", async () => {
      // Arrange
      const { Model } = await import("survey-core");
      vi.mocked(Model).mockImplementationOnce(function (this: any) {
        this.fromJSON = vi.fn();
        this.toJSON = vi.fn().mockReturnValue({});
        this.jsonErrors = [{ message: "bad" }];
        return this;
      });
      const creator = {
        activeTab: "json",
        JSON: {},
        getPlugin: vi.fn().mockReturnValue({
          model: { hasErrors: false, text: "{}" },
        }),
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(creator as any);

      // Assert
      expect(Result.isError(outcome)).toBe(true);
      if (Result.isError(outcome)) {
        expect(outcome.message).toBe(
          "Please fix the errors in the JSON schema and try again.",
        );
      }
    });

    it("should return success with parsed model JSON when valid", () => {
      // Arrange
      const creator = {
        activeTab: "json",
        JSON: {},
        getPlugin: vi.fn().mockReturnValue({
          model: { hasErrors: false, text: '{"pages":[]}' },
        }),
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const outcome = result.current.getJsonModel(creator as any);

      // Assert
      expect(Result.isSuccess(outcome)).toBe(true);
      if (Result.isSuccess(outcome)) {
        expect(outcome.value).toEqual({ pages: [] });
      }
    });
  });

  describe("registerJsonEditor", () => {
    it("should return a cleanup function", () => {
      // Arrange
      const remove = vi.fn();
      const creator = {
        activeTab: "design",
        onActiveTabChanged: { add: vi.fn(), remove },
      };
      const { result } = renderHook(() => useJsonEditor({}));

      // Act
      const cleanup = result.current.registerJsonEditor(creator as any);

      // Assert
      expect(typeof cleanup).toBe("function");
      cleanup();
      expect(remove).toHaveBeenCalled();
    });

    it("should call onJsonStateChange with NOT_ON_JSON_TAB_STATE when switching to non-json tab", () => {
      // Arrange
      const onJsonStateChange = vi.fn();
      let tabHandler: ((_s: any, opts: { tabName: string }) => void) | null =
        null;
      const creator = {
        activeTab: "design",
        onActiveTabChanged: {
          add: vi.fn((fn: any) => {
            tabHandler = fn;
          }),
          remove: vi.fn(),
        },
        getPlugin: vi.fn().mockReturnValue(null),
      };
      const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));
      result.current.registerJsonEditor(creator as any);

      // Act – simulate switching to a non-json tab (e.g. leave json)
      act(() => {
        tabHandler?.(creator, { tabName: "design" });
      });

      // Assert
      expect(onJsonStateChange).toHaveBeenCalledWith(NOT_ON_JSON_TAB_STATE);
    });

    it("should call onJsonStateChange with on-json state when switching to json tab", () => {
      // Arrange – enterJsonTab only runs when Ace is available
      vi.mocked(TabJsonEditorAcePlugin.hasAceEditor).mockReturnValue(true);
      const onJsonStateChange = vi.fn();
      let tabHandler: ((_s: any, opts: { tabName: string }) => void) | null =
        null;
      const creator = {
        activeTab: "json",
        onActiveTabChanged: {
          add: vi.fn((fn: any) => {
            tabHandler = fn;
          }),
          remove: vi.fn(),
        },
        getPlugin: vi.fn().mockReturnValue({
          model: {
            hasErrors: true,
            onPropertyChanged: { add: vi.fn(), remove: vi.fn() },
            aceEditor: null,
          },
        }),
      };
      const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));
      result.current.registerJsonEditor(creator as any);

      // Act
      act(() => {
        tabHandler?.(creator, { tabName: "json" });
      });

      // Assert – enterJsonTab notifies with current hasErrors
      expect(onJsonStateChange).toHaveBeenCalledWith(
        createOnJsonTabState({ hasErrors: true }),
      );
    });
  });
});
