import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createThemeAction = vi.fn();
const updateThemeAction = vi.fn();
const getThemesAction = vi.fn();

vi.mock("@/features/themes/create-theme", () => ({
  createThemeAction: (...args: unknown[]) => createThemeAction(...args),
}));
vi.mock("@/features/themes/update-theme", () => ({
  updateThemeAction: (...args: unknown[]) => updateThemeAction(...args),
}));
vi.mock("@/features/themes/list-themes", () => ({
  getThemesAction: (...args: unknown[]) => getThemesAction(...args),
}));
vi.mock("@/features/themes/delete-theme", () => ({
  deleteThemeAction: vi.fn(),
}));
vi.mock("@/features/themes/list-forms-for-theme", () => ({
  getFormsForThemeAction: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

import { useThemeManagement } from "../use-theme-management.hook";

class FakeEvent<TSender, TOptions> {
  handlers: Array<(sender: TSender, options: TOptions) => void> = [];
  add(handler: (sender: TSender, options: TOptions) => void) {
    this.handlers.push(handler);
  }
  remove(handler: (sender: TSender, options: TOptions) => void) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }
  fire(sender: TSender, options: TOptions) {
    this.handlers.forEach((h) => h(sender, options));
  }
}

function makeCreator(theme: Record<string, unknown>) {
  const themeEditor = {
    advancedModeEnabled: false,
    availableThemes: [] as string[],
    addTheme: vi.fn(),
    removeTheme: vi.fn(),
    // v3 loads the file, calls themeModel.setTheme (which raises onThemeSelected)
    // and only then invokes the callback.
    importFromFile(file: unknown, callback?: (theme: unknown) => void) {
      themeEditor.onThemeSelected.fire(null, {
        theme: { themeName: "default" },
      });
      callback?.({ themeName: "imported" });
    },
    onThemeSelected: new FakeEvent<unknown, { theme: unknown }>(),
    onThemePropertyChanged: new FakeEvent<unknown, unknown>(),
    themeModel: {
      toJSON: () => ({ ...theme }),
      setTheme: vi.fn(),
    },
  };
  return {
    theme,
    preferredColorPalette: "light",
    toolbar: { actions: [] as Array<{ id: string }> },
    onPropertyEditorUpdateTitleActions: new FakeEvent<unknown, unknown>(),
    onActiveTabChanged: new FakeEvent<unknown, { tabName?: string }>(),
    themeEditor,
  };
}

function renderThemeManagement(theme: Record<string, unknown>) {
  const creator = makeCreator(theme);
  const view = renderHook(() =>
    useThemeManagement({
      formId: "form-1",
      // The hook only touches the subset of the Creator modelled above.
      creator: creator as never,
      themeId: theme.id as string | undefined,
    }),
  );
  return { creator, view };
}

beforeEach(() => {
  vi.clearAllMocks();
  getThemesAction.mockResolvedValue({ value: [] });
});

describe("useThemeManagement dirty tracking", () => {
  it("starts clean and saves nothing when the theme was not edited", async () => {
    const { view } = renderThemeManagement({ id: "t1", themeName: "Acme" });

    expect(view.result.current.isThemeDirty).toBe(false);

    await act(async () => {
      await view.result.current.saveThemeHandler();
    });

    expect(view.result.current.themeSaveRequest).toBeNull();
    expect(updateThemeAction).not.toHaveBeenCalled();
    expect(createThemeAction).not.toHaveBeenCalled();
  });

  it("marks the theme dirty when a theme property changes", async () => {
    const { creator, view } = renderThemeManagement({
      id: "t1",
      themeName: "Acme",
    });

    act(() => {
      creator.themeEditor.onThemePropertyChanged.fire(null, {});
    });

    expect(view.result.current.isThemeDirty).toBe(true);
  });

  it("keeps the theme dirty across the syncTheme that follows every edit", async () => {
    // v3 assigns creator.theme on each property change. That must not look like a
    // theme switch, or the Save button would stop offering to save the edits.
    const { creator, view } = renderThemeManagement({
      id: "t1",
      themeName: "Acme",
    });

    act(() => {
      creator.themeEditor.onThemePropertyChanged.fire(null, {});
      creator.theme = { id: "t1", themeName: "Acme" };
    });

    expect(view.result.current.isThemeDirty).toBe(true);
  });

  it("stays dirty after importing a theme file", async () => {
    // The import raises onThemeSelected, which otherwise reads as "switched theme,
    // discard the edits" and would leave Save with nothing to offer.
    const { creator, view } = renderThemeManagement({
      id: "t1",
      themeName: "Acme",
    });

    act(() => {
      creator.themeEditor.importFromFile(new Blob(["{}"]), undefined);
    });

    expect(view.result.current.isThemeDirty).toBe(true);
  });

  it("drops the dirty flag when the user switches to another theme", async () => {
    const { creator, view } = renderThemeManagement({
      id: "t1",
      themeName: "Acme",
    });

    act(() => {
      creator.themeEditor.onThemePropertyChanged.fire(null, {});
    });
    expect(view.result.current.isThemeDirty).toBe(true);

    act(() => {
      creator.themeEditor.onThemeSelected.fire(null, {
        theme: { id: "t2", themeName: "Other" },
      });
    });

    expect(view.result.current.isThemeDirty).toBe(false);
  });
});

describe("useThemeManagement save flow", () => {
  it("asks the user, then overwrites the current theme", async () => {
    updateThemeAction.mockResolvedValue({ value: { name: "Acme" } });
    const { creator, view } = renderThemeManagement({
      id: "t1",
      themeName: "Acme",
    });

    act(() => {
      creator.themeEditor.onThemePropertyChanged.fire(null, {});
    });

    let saved: Promise<void>;
    act(() => {
      saved = view.result.current.saveThemeHandler();
    });

    await waitFor(() =>
      expect(view.result.current.themeSaveRequest).not.toBeNull(),
    );
    const request = view.result.current.themeSaveRequest!;
    expect(request.themeName).toBe("Acme");
    expect(request.isDefaultTheme).toBe(false);

    await act(async () => {
      request.resolve({ action: "overwrite" });
      await saved;
    });

    expect(updateThemeAction).toHaveBeenCalledTimes(1);
    expect(createThemeAction).not.toHaveBeenCalled();
    expect(view.result.current.isThemeDirty).toBe(false);
    expect(view.result.current.themeSaveRequest).toBeNull();
  });

  it("flags the reserved Default theme so it can only be saved as new", async () => {
    createThemeAction.mockResolvedValue({
      value: {
        id: "t9",
        name: "Midnight",
        jsonData: '{"themeName":"Midnight"}',
      },
    });
    const { creator, view } = renderThemeManagement({ themeName: "default" });

    act(() => {
      creator.themeEditor.onThemePropertyChanged.fire(null, {});
    });

    let saved: Promise<void>;
    act(() => {
      saved = view.result.current.saveThemeHandler();
    });

    await waitFor(() =>
      expect(view.result.current.themeSaveRequest).not.toBeNull(),
    );
    expect(view.result.current.themeSaveRequest!.isDefaultTheme).toBe(true);

    await act(async () => {
      view.result.current.themeSaveRequest!.resolve({
        action: "save-as-new",
        name: "Midnight",
      });
      await saved;
    });

    expect(createThemeAction).toHaveBeenCalledTimes(1);
    expect(updateThemeAction).not.toHaveBeenCalled();
    expect(view.result.current.currentThemeId).toBe("t9");
    expect(view.result.current.isThemeDirty).toBe(false);
  });

  it("persists nothing when the user discards the theme changes", async () => {
    const { creator, view } = renderThemeManagement({
      id: "t1",
      themeName: "Acme",
    });

    act(() => {
      creator.themeEditor.onThemePropertyChanged.fire(null, {});
    });

    let saved: Promise<void>;
    act(() => {
      saved = view.result.current.saveThemeHandler();
    });

    await waitFor(() =>
      expect(view.result.current.themeSaveRequest).not.toBeNull(),
    );
    await act(async () => {
      view.result.current.themeSaveRequest!.resolve({ action: "skip" });
      await saved;
    });

    expect(createThemeAction).not.toHaveBeenCalled();
    expect(updateThemeAction).not.toHaveBeenCalled();
    // Still dirty: the edits were kept in the editor, just not persisted.
    expect(view.result.current.isThemeDirty).toBe(true);
  });
});
