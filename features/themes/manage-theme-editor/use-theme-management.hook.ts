import { toast } from "@/components/ui/toast";
import { createThemeAction } from "@/features/themes/create-theme";
import { deleteThemeAction } from "@/features/themes/delete-theme";
import { getFormsForThemeAction } from "@/features/themes/list-forms-for-theme";
import { getThemesAction } from "@/features/themes/list-themes";
import { updateThemeAction } from "@/features/themes/update-theme";
import { StoredTheme } from "@/features/themes/types";
import type { ThemeDeleteRequest } from "./ui/theme-delete-dialog";
import type { ThemeSaveDecision, ThemeSaveRequest } from "./ui/theme-save-dialog";
import { Result } from "@/lib/result";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ITheme } from "survey-core";
import { registerThemes, sanitizeSurveyTheme } from "@/lib/themes/survey-theme";
import { DefaultLight } from "survey-core/themes";
import { ThemeTabPlugin } from "survey-creator-core";
import { SurveyCreator } from "survey-creator-react";

registerThemes();

const DEFAULT_THEME_NAME = "default";
/** Sentinel the form uses to mean "no tenant theme assigned". */
export const DEFAULT_THEME_ID = "0";

async function fetchThemes(): Promise<StoredTheme[]> {
  const result = await getThemesAction();
  if (result === undefined || Result.isError(result)) {
    toast.error("Could not proceed with fetching themes");
    return [];
  }

  const themes: StoredTheme[] = [];
  for (const theme of result.value) {
    try {
      const parsed = JSON.parse(theme.jsonData) as StoredTheme;
      themes.push(
        sanitizeSurveyTheme({
          ...parsed,
          name: theme.name,
          id: theme.id,
          // Theme Editor's dropdown keys off `themeName`, not the Hub `name`.
          themeName: theme.name || parsed.themeName,
        }),
      );
    } catch (error) {
      console.error("Skipped invalid theme JSON", theme.id, error);
    }
  }
  return themes;
}

/** Returns the created theme, or null once the failure has been surfaced. */
async function createTheme(theme: StoredTheme): Promise<StoredTheme | null> {
  const result = await createThemeAction(theme);
  if (result === undefined || Result.isError(result)) {
    toast.error(`Failed to create theme: ${result?.message ?? "unknown error"}`);
    return null;
  }

  const created = result.value;
  toast.success(`Theme "${created.name}" created successfully`);
  return sanitizeSurveyTheme({
    ...JSON.parse(created.jsonData),
    name: created.name,
    id: created.id,
    themeName: created.name,
  });
}

async function updateTheme(theme: StoredTheme): Promise<boolean> {
  const result = await updateThemeAction({ themeId: theme.id, theme });
  if (result === undefined || Result.isError(result)) {
    toast.error(`Failed to update theme: ${result?.message ?? "unknown error"}`);
    return false;
  }

  toast.success(`Theme "${result.value.name}" updated successfully`);
  return true;
}

interface UseThemeManagementProps {
  formId: string;
  creator?: SurveyCreator | null;
  themeId?: string;
  onThemeIdChanged?: (themeId: string) => void;
}

export const useThemeManagement = ({
  formId,
  creator,
  themeId,
  onThemeIdChanged,
}: UseThemeManagementProps) => {
  const [isThemeDirty, setIsThemeDirty] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string | undefined>(
    themeId,
  );
  const [themeSaveRequest, setThemeSaveRequest] =
    useState<ThemeSaveRequest | null>(null);
  const [themeDeleteRequest, setThemeDeleteRequest] =
    useState<ThemeDeleteRequest | null>(null);
  const [originalThemeId] = useState<string | undefined>(themeId);
  const themeManagementInitializedRef = useRef(false);
  const registeredThemeNamesRef = useRef<string[]>([DEFAULT_THEME_NAME]);
  const currentThemeIdRef = useRef<string | undefined>(themeId);
  currentThemeIdRef.current = currentThemeId;

  const addCustomTheme = useCallback(
    (theme: StoredTheme) => {
      const safeTheme = sanitizeSurveyTheme(theme);
      try {
        creator!.themeEditor.addTheme(safeTheme);
      } catch (error) {
        // v3's onAvailableThemesChanged always calls propertyGrid.survey.runExpressions().
        // Before the Themes tab activates that survey can be missing; Themes[] is still
        // updated and activate() refreshes the choices.
        console.error("addTheme failed (retried on Themes tab activate)", error);
      }

      if (safeTheme.id === currentThemeIdRef.current) {
        creator!.theme = safeTheme;
      }
    },
    [creator],
  );

  /**
   * Persists the current theme when it is dirty. Resolves once the user has chosen,
   * so the caller can always save the form JSON afterwards.
   */
  const saveThemeHandler = useCallback(async (): Promise<void> => {
    const themeModel = creator?.themeEditor?.themeModel;
    if (!isThemeDirty || !themeModel) {
      return;
    }

    const currentTheme = creator?.theme as StoredTheme | undefined;
    const theme = sanitizeSurveyTheme({
      ...currentTheme,
      ...themeModel.toJSON(),
      id: currentTheme?.id ?? currentThemeId,
    } as StoredTheme);

    const themeName = theme.themeName ?? DEFAULT_THEME_NAME;
    const isDefaultTheme = themeName.toLowerCase() === DEFAULT_THEME_NAME;

    const decision = await new Promise<ThemeSaveDecision>((resolve) => {
      setThemeSaveRequest({ themeName, isDefaultTheme, resolve });
    });
    setThemeSaveRequest(null);

    if (decision.action === "skip") {
      return;
    }

    // A failure is already surfaced by the helper; leave the theme dirty and let
    // the caller carry on saving the form JSON from the same click.
    if (decision.action === "save-as-new") {
      const created = await createTheme({
        ...theme,
        themeName: decision.name,
        name: decision.name,
      });
      if (!created) {
        return;
      }

      setCurrentThemeId(created.id);
      addCustomTheme(created);
      creator!.themeEditor.themeModel.setTheme(created);
    } else if (!(await updateTheme({ ...theme, name: themeName }))) {
      return;
    }

    setIsThemeDirty(false);
  }, [creator, isThemeDirty, currentThemeId, addCustomTheme]);

  const deleteThemeHandler = useCallback(async () => {
    const theme = creator?.theme as StoredTheme | undefined;
    if (!creator || !theme?.id) {
      return;
    }

    const formsResult = await getFormsForThemeAction(theme.id);
    if (formsResult === undefined || Result.isError(formsResult)) {
      toast.error(formsResult?.message || "Failed to fetch forms for theme");
      return;
    }

    setThemeDeleteRequest({
      themeName: theme.themeName ?? DEFAULT_THEME_NAME,
      formsInUse: formsResult.value.filter((form) => form.id !== formId),
      onConfirm: async () => {
        const result = await deleteThemeAction(theme.id);
        if (result === undefined || Result.isError(result)) {
          toast.error(result?.message || "Failed to delete theme");
          return;
        }

        creator.themeEditor.removeTheme(theme, true);
        creator.theme = { themeName: DEFAULT_THEME_NAME };
        setIsThemeDirty(false);
        toast.success("Theme deleted successfully");
      },
    });
  }, [creator, formId]);

  const deleteThemeActionBtn = useMemo(
    () =>
      new Action({
        id: "svd-delete-custom-theme",
        title: "Delete theme",
        action: deleteThemeHandler,
        iconName: "icon-delete",
        showTitle: false,
        enabledIf: () => creator?.theme?.themeName !== DEFAULT_THEME_NAME,
      }),
    [deleteThemeHandler, creator],
  );

  const handleThemeChanged = useCallback(
    (sender: ThemeTabPlugin, options: { theme: ITheme }) => {
      const selectedTheme = options.theme as StoredTheme;
      const isDefaultTheme =
        selectedTheme?.themeName?.toLowerCase() === DEFAULT_THEME_NAME;
      const selectedThemeId = isDefaultTheme ? undefined : selectedTheme?.id;

      if (!isDefaultTheme && !selectedThemeId) {
        return;
      }

      // Switching themes discards the edits made to the previous one.
      setIsThemeDirty(false);
      setCurrentThemeId(selectedThemeId);

      if (selectedThemeId !== originalThemeId) {
        setTimeout(() => {
          onThemeIdChanged?.(selectedThemeId ?? DEFAULT_THEME_ID);
        }, 0);
      }
    },
    [originalThemeId, onThemeIdChanged],
  );

  const handleThemePropertyChanged = useCallback(() => {
    // Do not gate on ThemeTabPlugin.isModified: v3 syncs creator.theme before this
    // event, so isModified is often false (or throws when cssVariables is missing).
    setIsThemeDirty(true);
  }, []);

  useEffect(() => {
    if (!creator || themeManagementInitializedRef.current) {
      return;
    }

    const resetThemeActionIndex = creator.toolbar.actions.findIndex(
      (action) => action.id === "svc-reset-theme",
    );
    if (resetThemeActionIndex !== -1) {
      creator.toolbar.actions.splice(resetThemeActionIndex, 1);
    }

    creator.onPropertyEditorUpdateTitleActions.add((_, options) => {
      if (options.property?.name !== "themeName") {
        return;
      }
      const exists = options.titleActions.some(
        (action: unknown) =>
          (action as { id: string })?.id === "svd-delete-custom-theme",
      );
      if (!exists) {
        options.titleActions.push(deleteThemeActionBtn);
      }
    });

    const themeTabPlugin = creator.themeEditor;
    themeTabPlugin.advancedModeEnabled = true;
    themeTabPlugin.onThemeSelected.add(handleThemeChanged);
    themeTabPlugin.onThemePropertyChanged.add(handleThemePropertyChanged);

    // Importing a theme file goes through `themeModel.setTheme`, which raises only
    // `onThemeSelected` — the same event a chooser switch raises, and that one clears
    // the dirty flag. `setTheme` runs before this callback, so marking dirty here wins
    // and Save offers to keep the imported theme. (Editing a property, including the
    // background image, already raises `onThemePropertyChanged`.)
    const importFromFile = themeTabPlugin.importFromFile;
    themeTabPlugin.importFromFile = (file, callback) =>
      importFromFile.call(themeTabPlugin, file, (theme: ITheme) => {
        setIsThemeDirty(true);
        callback?.(theme);
      });

    const applyThemeChooserChoices = () => {
      try {
        creator.themeEditor.availableThemes = registeredThemeNamesRef.current;
      } catch {
        // The property grid survey only exists after ThemeTabPlugin.activate().
      }
    };

    const onActiveTabChanged = (_: unknown, options: { tabName?: string }) => {
      if (options.tabName === "theme") {
        applyThemeChooserChoices();
      }
    };
    creator.onActiveTabChanged.add(onActiveTabChanged);

    fetchThemes()
      .then((themes) => {
        for (const theme of themes) {
          addCustomTheme(theme);
        }
        registeredThemeNamesRef.current = [
          ...new Set([
            DEFAULT_THEME_NAME,
            ...themes
              .map((theme) => theme.themeName)
              .filter((name): name is string => Boolean(name)),
          ]),
        ];
        applyThemeChooserChoices();

        const assignedTheme = currentThemeIdRef.current
          ? themes.find((theme) => theme.id === currentThemeIdRef.current)
          : undefined;
        if (!assignedTheme) {
          creator.theme = sanitizeSurveyTheme(DefaultLight);
        }
      })
      .catch((error) => console.error("Error: ", error));

    themeManagementInitializedRef.current = true;

    return () => {
      themeTabPlugin.importFromFile = importFromFile;
      creator.onActiveTabChanged.remove(onActiveTabChanged);
      creator.themeEditor.onThemeSelected.remove(handleThemeChanged);
      creator.themeEditor.onThemePropertyChanged.remove(
        handleThemePropertyChanged,
      );
      themeManagementInitializedRef.current = false;
    };
  }, [
    creator,
    addCustomTheme,
    deleteThemeActionBtn,
    handleThemeChanged,
    handleThemePropertyChanged,
  ]);

  return {
    currentThemeId,
    isThemeDirty,
    themeSaveRequest,
    themeDeleteRequest,
    closeThemeDeleteRequest: () => setThemeDeleteRequest(null),
    saveThemeHandler,
  };
};
