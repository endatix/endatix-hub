import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSurveyEmbedBehavior } from "../use-survey-embed-behavior";
import { SurveyModel } from "survey-core";

const mockPostMessage = vi.fn();
const originalWindow = globalThis.window;

beforeEach(() => {
  vi.clearAllMocks();

  Object.defineProperty(globalThis, "window", {
    value: {
      ...originalWindow,
      parent: {
        ...originalWindow,
        location: { origin: "https://example.com" },
      },
    },
    writable: true,
  });

  globalThis.window.parent.postMessage = mockPostMessage;
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    value: originalWindow,
    writable: true,
  });
});

describe("useSurveyEmbedBehavior", () => {
  describe("when not embedded", () => {
    it("does not send any messages", () => {
      const { result } = renderHook(() =>
        useSurveyEmbedBehavior({ isEmbed: false, formId: "123" }),
      );

      result.current.sendEmbedMessage("form-loaded");

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it("registerEmbedHandlers returns a no-op", () => {
      const mockModel = {
        onAfterRenderSurvey: { add: vi.fn(), remove: vi.fn() },
        onCurrentPageChanged: { add: vi.fn(), remove: vi.fn() },
        onAfterRenderPage: { add: vi.fn(), remove: vi.fn() },
        onNavigateToUrl: { add: vi.fn(), remove: vi.fn() },
      } as unknown as SurveyModel;

      const { result } = renderHook(() =>
        useSurveyEmbedBehavior({ isEmbed: false, formId: "123" }),
      );

      const unregister = result.current.registerEmbedHandlers(mockModel);
      unregister();

      expect(mockModel.onAfterRenderSurvey.add).not.toHaveBeenCalled();
    });
  });

  describe("when embedded", () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, "window", {
        value: {
          ...originalWindow,
          parent: globalThis,
          location: { origin: "https://endatix.com" },
        },
        writable: true,
      });
      globalThis.window.parent.postMessage = mockPostMessage;
    });

    it("sends embed message to parent window", () => {
      const { result } = renderHook(() =>
        useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
      );

      result.current.sendEmbedMessage("form-loaded");

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: "endatix:form-loaded",
          formId: "123",
        },
        "*",
      );
    });

    it("sends navigate message with URL data", () => {
      const { result } = renderHook(() =>
        useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
      );

      result.current.sendEmbedMessage("navigate", {
        url: "https://example.com/success",
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: "endatix:navigate",
          formId: "123",
          url: "https://example.com/success",
        },
        "*",
      );
    });

    it("does not send message when not in iframe", () => {
      const mockWin = {
        ...originalWindow,
        parent: {},
        location: { origin: "https://endatix.com" },
      };
      mockWin.parent = mockWin;

      Object.defineProperty(globalThis, "window", {
        value: mockWin,
        writable: true,
      });

      const { result } = renderHook(() =>
        useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
      );

      result.current.sendEmbedMessage("form-loaded");

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    describe("registerEmbedHandlers", () => {
      it("registers event handlers on the survey model", () => {
        const addMock = vi.fn();
        const removeMock = vi.fn();

        const mockModel = {
          onAfterRenderSurvey: { add: addMock, remove: removeMock },
          onCurrentPageChanged: { add: addMock, remove: removeMock },
          onAfterRenderPage: { add: addMock, remove: removeMock },
          onNavigateToUrl: { add: addMock, remove: removeMock },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        result.current.registerEmbedHandlers(mockModel);

        expect(addMock).toHaveBeenCalledTimes(4);
      });

      it("returns cleanup function that removes handlers", () => {
        const addMock = vi.fn();
        const removeMock = vi.fn();

        const mockModel = {
          onAfterRenderSurvey: { add: addMock, remove: removeMock },
          onCurrentPageChanged: { add: addMock, remove: removeMock },
          onAfterRenderPage: { add: addMock, remove: removeMock },
          onNavigateToUrl: { add: addMock, remove: removeMock },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        const unregister = result.current.registerEmbedHandlers(mockModel);
        unregister();

        expect(removeMock).toHaveBeenCalledTimes(4);
      });

      it("sends form-loaded message when survey renders via onAfterRenderSurvey", () => {
        let surveyRenderCallback: (() => void) | undefined;

        const mockOnAfterRenderSurvey = {
          add: vi.fn((callback: () => void) => {
            surveyRenderCallback = callback;
          }),
          remove: vi.fn(),
        };

        const mockModel = {
          onAfterRenderSurvey: mockOnAfterRenderSurvey,
          onCurrentPageChanged: { add: vi.fn(), remove: vi.fn() },
          onAfterRenderPage: { add: vi.fn(), remove: vi.fn() },
          onNavigateToUrl: { add: vi.fn(), remove: vi.fn() },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        result.current.registerEmbedHandlers(mockModel);

        // Verify handler was registered
        expect(mockOnAfterRenderSurvey.add).toHaveBeenCalledTimes(1);

        // Simulate survey rendering
        if (surveyRenderCallback) {
          act(() => {
            surveyRenderCallback!();
          });
        }

        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            type: "endatix:form-loaded",
            formId: "123",
          }),
          "*",
        );
      });

      it("blocks unsafe URLs in onNavigateToUrl handler", () => {
        let capturedNavigateCallback:
          | ((
              sender: SurveyModel,
              options: { url: string; allow: boolean },
            ) => void)
          | null = null;

        const addMock = vi.fn((callback: (...args: unknown[]) => void) => {
          capturedNavigateCallback =
            callback as typeof capturedNavigateCallback;
        });
        const removeMock = vi.fn();
        const consoleWarnSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const mockModel = {
          onAfterRenderSurvey: { add: addMock, remove: removeMock },
          onCurrentPageChanged: { add: addMock, remove: removeMock },
          onAfterRenderPage: { add: addMock, remove: removeMock },
          onNavigateToUrl: { add: addMock, remove: removeMock },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        result.current.registerEmbedHandlers(mockModel);

        if (capturedNavigateCallback) {
          act(() => {
            capturedNavigateCallback!(mockModel, {
              url: "javascript:alert(1)",
              allow: true,
            });
          });

          expect(mockPostMessage).not.toHaveBeenCalled();
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            "Endatix Embed: Blocked unsafe navigation URL",
            "javascript:alert(1)",
          );
        }

        consoleWarnSpy.mockRestore();
      });

      it("allows safe absolute URLs in onNavigateToUrl handler", () => {
        let capturedNavigateCallback:
          | ((
              sender: SurveyModel,
              options: { url: string; allow: boolean },
            ) => void)
          | null = null;

        const addMock = vi.fn((callback: (...args: unknown[]) => void) => {
          capturedNavigateCallback =
            callback as typeof capturedNavigateCallback;
        });
        const removeMock = vi.fn();

        const mockModel = {
          onAfterRenderSurvey: { add: addMock, remove: removeMock },
          onCurrentPageChanged: { add: addMock, remove: removeMock },
          onAfterRenderPage: { add: addMock, remove: removeMock },
          onNavigateToUrl: { add: addMock, remove: removeMock },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        result.current.registerEmbedHandlers(mockModel);

        if (capturedNavigateCallback) {
          act(() => {
            capturedNavigateCallback!(mockModel, {
              url: "https://example.com/success",
              allow: true,
            });
          });

          expect(mockPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              type: "endatix:navigate",
              url: "https://example.com/success",
            }),
            "*",
          );
        }
      });

      it("allows relative URLs in onNavigateToUrl handler", () => {
        let capturedNavigateCallback:
          | ((
              sender: SurveyModel,
              options: { url: string; allow: boolean },
            ) => void)
          | null = null;

        const addMock = vi.fn((callback: (...args: unknown[]) => void) => {
          capturedNavigateCallback =
            callback as typeof capturedNavigateCallback;
        });
        const removeMock = vi.fn();

        const mockModel = {
          onAfterRenderSurvey: { add: addMock, remove: removeMock },
          onCurrentPageChanged: { add: addMock, remove: removeMock },
          onAfterRenderPage: { add: addMock, remove: removeMock },
          onNavigateToUrl: { add: addMock, remove: removeMock },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        result.current.registerEmbedHandlers(mockModel);

        if (capturedNavigateCallback) {
          act(() => {
            capturedNavigateCallback!(mockModel, {
              url: "/thank-you",
              allow: true,
            });
          });

          expect(mockPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              type: "endatix:navigate",
              url: "/thank-you",
            }),
            "*",
          );
        }
      });

      it("blocks data: URLs in onNavigateToUrl handler", () => {
        let capturedNavigateCallback:
          | ((
              sender: SurveyModel,
              options: { url: string; allow: boolean },
            ) => void)
          | null = null;

        const addMock = vi.fn((callback: (...args: unknown[]) => void) => {
          capturedNavigateCallback =
            callback as typeof capturedNavigateCallback;
        });
        const removeMock = vi.fn();
        const consoleWarnSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});

        const mockModel = {
          onAfterRenderSurvey: { add: addMock, remove: removeMock },
          onCurrentPageChanged: { add: addMock, remove: removeMock },
          onAfterRenderPage: { add: addMock, remove: removeMock },
          onNavigateToUrl: { add: addMock, remove: removeMock },
        } as unknown as SurveyModel;

        const { result } = renderHook(() =>
          useSurveyEmbedBehavior({ isEmbed: true, formId: "123" }),
        );

        result.current.registerEmbedHandlers(mockModel);

        if (capturedNavigateCallback) {
          act(() => {
            capturedNavigateCallback!(mockModel, {
              url: "data:text/html,<script>alert(1)</script>",
              allow: true,
            });
          });

          expect(mockPostMessage).not.toHaveBeenCalled();
          expect(consoleWarnSpy).toHaveBeenCalled();
        }

        consoleWarnSpy.mockRestore();
      });
    });
  });
});
