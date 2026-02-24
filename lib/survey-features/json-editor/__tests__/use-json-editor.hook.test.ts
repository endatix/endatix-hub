import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JSON_EDITOR_PROPERTY_NAMES } from "../json-editor-state";
import { useJsonEditor } from "../use-json-editor.hook";

function createMockCreator() {
  const tabHandlers: Array<
    (sender: unknown, options: { tabName: string }) => void
  > = [];
  const onActiveTabChanged = {
    add: vi.fn(
      (handler: (sender: unknown, options: { tabName: string }) => void) => {
        tabHandlers.push(handler);
      },
    ),
    remove: vi.fn(
      (handler: (sender: unknown, options: { tabName: string }) => void) => {
        const i = tabHandlers.indexOf(handler);
        if (i !== -1) tabHandlers.splice(i, 1);
      },
    ),
  };

  const propertyHandlers: Array<
    (sender: unknown, options: { name: string; newValue: unknown }) => void
  > = [];
  const model = {
    hasErrors: false,
    text: "",
    onPropertyChanged: {
      add: vi.fn(
        (
          handler: (
            sender: unknown,
            options: { name: string; newValue: unknown },
          ) => void,
        ) => {
          propertyHandlers.push(handler);
        },
      ),
      remove: vi.fn(
        (
          handler: (
            sender: unknown,
            options: { name: string; newValue: unknown },
          ) => void,
        ) => {
          const i = propertyHandlers.indexOf(handler);
          if (i !== -1) propertyHandlers.splice(i, 1);
        },
      ),
    },
  };

  const originalImportFromFile = vi.fn();
  const jsonPlugin = {
    model,
    importFromFile: originalImportFromFile,
  };

  const creator = {
    text: "",
    onActiveTabChanged,
    getPlugin: vi.fn((name: string) =>
      name === "json" ? jsonPlugin : undefined,
    ),
  };

  return {
    creator: creator as any,
    fireTabChange(tabName: string) {
      tabHandlers.forEach((h) => h(creator, { tabName }));
    },
    firePropertyChange(name: string, newValue: unknown) {
      propertyHandlers.forEach((h) => h(model, { name, newValue }));
    },
    getModel: () => model,
    getJsonPlugin: () => jsonPlugin,
  };
}

describe("useJsonEditor", () => {
  it("returns registerJsonEditor function", () => {
    const { result } = renderHook(() => useJsonEditor({}));
    expect(typeof result.current.registerJsonEditor).toBe("function");
  });

  it("does not call onJsonStateChange on register when no tab event fired", () => {
    const onJsonStateChange = vi.fn();
    const { creator } = createMockCreator();
    const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));

    result.current.registerJsonEditor(creator);

    expect(onJsonStateChange).not.toHaveBeenCalled();
  });

  it("calls onJsonStateChange with NOT_ON_JSON_TAB_STATE when tab changes to non-json", () => {
    const onJsonStateChange = vi.fn();
    const mock = createMockCreator();
    const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));

    const cleanup = result.current.registerJsonEditor(mock.creator);
    mock.fireTabChange("designer");

    expect(onJsonStateChange).toHaveBeenCalledWith({
      hasErrors: false,
      isOnJsonTab: false,
      isJsonModified: false,
    });
    cleanup();
  });

  it("calls onJsonStateChange with on-json-tab state when tab changes to json", () => {
    const onJsonStateChange = vi.fn();
    const mock = createMockCreator();
    const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));

    result.current.registerJsonEditor(mock.creator);
    mock.fireTabChange("json");

    expect(onJsonStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        hasErrors: false,
        isOnJsonTab: true,
        isJsonModified: false,
      }),
    );
  });

  it("calls onJsonStateChange when model hasErrors changes after entering json tab", () => {
    const onJsonStateChange = vi.fn();
    const mock = createMockCreator();
    const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));

    result.current.registerJsonEditor(mock.creator);
    mock.fireTabChange("json");
    onJsonStateChange.mockClear();

    mock.getModel().hasErrors = true;
    mock.firePropertyChange(JSON_EDITOR_PROPERTY_NAMES.hasErrors, true);

    expect(onJsonStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        hasErrors: true,
        isOnJsonTab: true,
      }),
    );
  });

  it("removes tab listener on cleanup", () => {
    const mock = createMockCreator();
    const { result } = renderHook(() =>
      useJsonEditor({ onJsonStateChange: vi.fn() }),
    );

    const cleanup = result.current.registerJsonEditor(mock.creator);
    expect(mock.creator.onActiveTabChanged.add).toHaveBeenCalled();
    const removeSpy = mock.creator.onActiveTabChanged.remove;

    cleanup();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  it("after cleanup, tab change does not call onJsonStateChange", () => {
    const onJsonStateChange = vi.fn();
    const mock = createMockCreator();
    const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));

    const cleanup = result.current.registerJsonEditor(mock.creator);
    cleanup();
    onJsonStateChange.mockClear();

    mock.fireTabChange("json");

    expect(onJsonStateChange).not.toHaveBeenCalled();
  });

  it("when plugin has no model, entering json tab still notifies with isOnJsonTab true", () => {
    const onJsonStateChange = vi.fn();
    const mock = createMockCreator();
    mock.creator.getPlugin = vi.fn(() => ({ model: undefined })); // no model
    const { result } = renderHook(() => useJsonEditor({ onJsonStateChange }));

    result.current.registerJsonEditor(mock.creator);
    mock.fireTabChange("json");

    expect(onJsonStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        isOnJsonTab: true,
        isJsonModified: false,
      }),
    );
  });

  it("cleanup after entering json tab removes model listener", () => {
    const mock = createMockCreator();
    const { result } = renderHook(() =>
      useJsonEditor({ onJsonStateChange: vi.fn() }),
    );

    const cleanup = result.current.registerJsonEditor(mock.creator);
    mock.fireTabChange("json");
    const removeSpy = mock.getModel().onPropertyChanged.remove;

    cleanup();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
