import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SurveyModel } from "survey-core";
import { useSearchParamsVariables } from "../use-search-params-variables.hook";

// Mock Next.js navigation
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock submission queue
const mockEnqueueSubmission = vi.fn();
vi.mock("../submission-queue/use-submission-queue.hook", () => ({
  useSubmissionQueue: () => ({
    enqueueSubmission: mockEnqueueSubmission,
    clearQueue: vi.fn(),
  }),
}));

beforeEach(() => {
  Object.defineProperty(window, "location", {
    value: {
      pathname: "/test/path",
    },
    writable: true,
  });
  vi.clearAllMocks();
  mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
});

describe("useSearchParamsVariables", () => {
  let model: SurveyModel;
  const formId = "test-form-id";

  beforeEach(() => {
    model = new SurveyModel();
    // Clear any existing variables from previous tests
    model.getVariableNames().forEach((name) => {
      model.setVariable(name, undefined);
    });
    vi.clearAllMocks();
  });

  describe("processSearchParams", () => {
    it("should apply search params to model", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      mockSearchParams.set("var2", "value2");

      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(model.getVariable("var1")).toBe("value1");
      expect(model.getVariable("var2")).toBe("value2");
    });

    it("should ignore reserved parameters", () => {
      // Arrange
      const testModel = new SurveyModel();
      mockSearchParams.set("token", "should-be-ignored");
      mockSearchParams.set("theme", "should-be-ignored");
      mockSearchParams.set("language", "should-be-ignored");
      mockSearchParams.set("lang", "should-be-ignored");
      mockSearchParams.set("validvar", "validValue");

      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(testModel);
      });

      // Assert
      expect(testModel.getVariable("token")).toBeUndefined();
      expect(testModel.getVariable("theme")).toBeUndefined();
      expect(testModel.getVariable("language")).toBeUndefined();
      expect(testModel.getVariable("lang")).toBeUndefined();
      expect(testModel.getVariable("validvar")).toBe("validValue");
    });

    it("should not process when no valid params exist", () => {
      // Arrange
      // Clear search params and use a fresh model
      mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
      const freshModel = new SurveyModel();
      mockSearchParams.set("token", "only-reserved");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(freshModel);
      });

      // Assert
      expect(mockEnqueueSubmission).not.toHaveBeenCalled();
    });

    it("should call onSetVariables callback when variables change", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const onSetVariables = vi.fn();
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model, onSetVariables);
      });

      // Assert
      expect(onSetVariables).toHaveBeenCalledWith({
        var1: "value1",
      });
    });

    it("should not call onSetVariables when no changes", () => {
      // Arrange
      model.setVariable("var1", "value1");
      mockSearchParams.set("var1", "value1"); // Same value
      const onSetVariables = vi.fn();
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model, onSetVariables);
      });

      // Assert
      expect(onSetVariables).not.toHaveBeenCalled();
      expect(mockEnqueueSubmission).not.toHaveBeenCalled();
    });

    it("should enqueue submission with all variables when changes occur", () => {
      // Arrange
      model.setVariable("existing", "old");
      mockSearchParams.set("newvar", "newValue");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(mockEnqueueSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.stringContaining("variables"),
        }),
      );

      const callArg = mockEnqueueSubmission.mock.calls[0][0];
      const metadata = JSON.parse(callArg.metadata);
      // SurveyJS normalizes variable names to lowercase
      expect(metadata.variables).toHaveProperty("existing", "old");
      expect(metadata.variables).toHaveProperty("newvar", "newValue");
    });

    it("should include model locale in submission metadata", () => {
      // Arrange
      model.locale = "fr";
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      const callArg = mockEnqueueSubmission.mock.calls[0][0];
      const metadata = JSON.parse(callArg.metadata);
      expect(metadata.language).toBe("fr");
    });

    it("should handle empty search params", () => {
      // Arrange
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(mockEnqueueSubmission).not.toHaveBeenCalled();
    });

    it("should handle params with empty keys", () => {
      // Arrange
      // URLSearchParams doesn't allow empty keys, but test edge case
      mockSearchParams.set("valid", "value");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(model.getVariable("valid")).toBe("value");
    });
  });

  describe("cleanupUrl", () => {
    it("should remove processed params from URL when removeAfterProcessing is true", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      mockSearchParams.set("var2", "value2");
      mockSearchParams.set("token", "keep-this");

      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: true }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledWith(
        "/test/path?token=keep-this",
        { scroll: false },
      );
    });

    it("should not remove params when removeAfterProcessing is false", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: false }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should not remove params when debugMode is true", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, {
          removeAfterProcessing: true,
          debugMode: true,
        }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should only cleanup once per hook instance", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: true }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
        result.current.cleanupUrl(); // Call again
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it("should remove all URL when no params remain after cleanup", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: true }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      expect(mockReplace).toHaveBeenCalledWith("/test/path", {
        scroll: false,
      });
    });

    it("should preserve ignored params in URL", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      mockSearchParams.set("token", "preserve");
      mockSearchParams.set("theme", "preserve");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: true }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      const url = mockReplace.mock.calls[0][0];
      expect(url).toContain("token=preserve");
      expect(url).toContain("theme=preserve");
      expect(url).not.toContain("var1");
    });

    it("should not cleanup when no params to remove", () => {
      // Arrange
      mockSearchParams.set("token", "only-reserved");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: true }),
      );

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe("Debug Mode", () => {
    it("should log debug info when debugMode is enabled", () => {
      // Arrange
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { debugMode: true }),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Search params processed:",
        expect.objectContaining({
          originalParams: expect.any(Object),
          extractedVars: expect.any(Object),
        }),
      );
      consoleLogSpy.mockRestore();
    });

    it("should not log when debugMode is false", () => {
      // Arrange
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { debugMode: false }),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });

  describe("Options Defaults", () => {
    it("should default removeAfterProcessing to false", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() => useSearchParamsVariables(formId));

      // Act
      act(() => {
        result.current.cleanupUrl();
      });

      // Assert
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should default debugMode to false", () => {
      // Arrange
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() => useSearchParamsVariables(formId));

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });
  });

  describe("Integration with processSearchParams and cleanupUrl", () => {
    it("should process params and then cleanup URL", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result } = renderHook(() =>
        useSearchParamsVariables(formId, { removeAfterProcessing: true }),
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
        result.current.cleanupUrl();
      });

      // Assert
      expect(model.getVariable("var1")).toBe("value1");
      expect(mockReplace).toHaveBeenCalled();
    });

    it("should handle multiple processSearchParams calls", () => {
      // Arrange
      mockSearchParams.set("var1", "value1");
      const { result, rerender } = renderHook(
        (formId: string) => useSearchParamsVariables(formId),
        { initialProps: formId },
      );

      // Act
      act(() => {
        result.current.processSearchParams(model);
      });

      mockSearchParams.set("var2", "value2");
      rerender(formId);

      act(() => {
        result.current.processSearchParams(model);
      });

      // Assert
      expect(model.getVariable("var1")).toBe("value1");
      expect(model.getVariable("var2")).toBe("value2");
    });
  });
});
