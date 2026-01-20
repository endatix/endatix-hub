import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCreatorView } from "@/features/asset-storage/use-cases/view-protected-files/use-creator-view.hook";
import { SurveyCreatorModel } from "survey-creator-core";
import { useAssetStorage } from "@/features/asset-storage/ui/asset-storage.context";
import { useStorageView } from "@/features/asset-storage/use-cases/view-protected-files/use-storage-view.hook";

// Mock dependencies
vi.mock("@/features/asset-storage/ui/asset-storage.context", () => ({
  useAssetStorage: vi.fn(),
}));

vi.mock(
  "@/features/asset-storage/use-cases/view-protected-files/use-storage-view.hook",
  () => ({
    useStorageView: vi.fn(),
  }),
);

describe("useCreatorView", () => {
  const mockSetModelMetadata = vi.fn();
  const mockRegisterViewHandlers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStorageView).mockReturnValue({
      setModelMetadata: mockSetModelMetadata,
      registerViewHandlers: mockRegisterViewHandlers,
    } as any);
  });

  it("should initialize correctly", () => {
    vi.mocked(useAssetStorage).mockReturnValue({ config: { isPrivate: true } } as any);

    const { result } = renderHook(() => useCreatorView({}));

    expect(result.current.isStorageReady).toBe(false);
    expect(result.current.registerViewHandlers).toBeDefined();
  });

  it("should register survey instance created handler in creator", () => {
    vi.mocked(useAssetStorage).mockReturnValue({ config: { isPrivate: true } } as any);
    const mockCreator = {
      onSurveyInstanceCreated: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    } as unknown as SurveyCreatorModel;

    const { result } = renderHook(() => useCreatorView({}));

    let unregister: any;
    act(() => {
      unregister = result.current.registerViewHandlers(mockCreator);
    });

    expect(mockCreator.onSurveyInstanceCreated.add).toHaveBeenCalledTimes(1);
    expect(result.current.isStorageReady).toBe(true);

    act(() => {
      unregister();
    });

    expect(mockCreator.onSurveyInstanceCreated.remove).toHaveBeenCalledTimes(1);
    expect(result.current.isStorageReady).toBe(false);
  });

  it("should handle survey instance creation and call handlers when private", () => {
    vi.mocked(useAssetStorage).mockReturnValue({ config: { isPrivate: true } } as any);
    const mockCreator = {
      onSurveyInstanceCreated: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    } as unknown as SurveyCreatorModel;

    const { result } = renderHook(() => useCreatorView({}));

    act(() => {
      result.current.registerViewHandlers(mockCreator);
    });

    const handler = (
      mockCreator.onSurveyInstanceCreated.add as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];

    const mockSurvey = { id: "test-survey" };
    const options = { survey: mockSurvey };

    act(() => {
      handler(mockCreator, options);
    });

    expect(mockSetModelMetadata).toHaveBeenCalledWith(mockSurvey);
    expect(mockRegisterViewHandlers).toHaveBeenCalledWith(mockSurvey);
  });

  it("should only call setModelMetadata but not registerViewHandlers when not private", () => {
    vi.mocked(useAssetStorage).mockReturnValue({ config: { isPrivate: false } } as any);
    const mockCreator = {
      onSurveyInstanceCreated: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    } as unknown as SurveyCreatorModel;

    const { result } = renderHook(() => useCreatorView({}));

    act(() => {
      result.current.registerViewHandlers(mockCreator);
    });

    const handler = (
      mockCreator.onSurveyInstanceCreated.add as ReturnType<typeof vi.fn>
    ).mock.calls[0][0];

    const mockSurvey = { id: "test-survey" };
    const options = { survey: mockSurvey };

    act(() => {
      handler(mockCreator, options);
    });

    expect(mockSetModelMetadata).toHaveBeenCalledWith(mockSurvey);
    expect(mockRegisterViewHandlers).not.toHaveBeenCalled();
  });
});
