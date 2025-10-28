import { toast } from "@/components/ui/toast";
import { createThemeAction } from "@/features/forms/application/actions/create-theme.action";
import { deleteThemeAction } from "@/features/forms/application/actions/delete-theme.action";
import { getFormsForThemeAction } from "@/features/forms/application/actions/get-forms-for-theme.action";
import { getThemesAction } from "@/features/forms/application/actions/get-themes.action";
import { updateThemeAction } from "@/features/forms/application/actions/update-theme.action";
import { StoredTheme } from "@/features/forms/domain/models/theme";
import { Result } from "@/lib/result";
import {
  useCallback,
  useEffect,
  useMemo,
  useTransition,
  useRef,
  useState,
} from "react";
import {
  Action,
  ITheme,
  QuestionBooleanModel,
  QuestionHtmlModel,
  QuestionTextModel,
  RegexValidator,
  Serializer,
  settings,
  SurveyModel,
  SvgRegistry,
} from "survey-core";
import { BorderlessLightPanelless, DefaultLight } from "survey-core/themes";
import { ThemeTabPlugin } from "survey-creator-core";
import { SurveyCreator } from "survey-creator-react";

interface SaveThemeData {
  save_as_new: boolean;
  theme_name: string;
}

interface UseThemeManagementProps {
  formId: string;
  creator?: SurveyCreator | null;
  themeId?: string;
  onThemeIdChanged?: (themeId: string) => void;
  onPostThemeSave?: () => Promise<void>;
}

Serializer.addProperty("theme", {
  name: "id",
  type: "string",
  category: "general",
  visible: false,
});

const saveAsIcon =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d = "M24 11H22V13H20V11H18V9H20V7H22V9H24V11ZM20 14H22V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V4L4 2H20C21.1 2 22 2.9 22 4V6H20V4H17V8H7V4H4.83L4 4.83V20H6V13H18V20H20V14ZM9 6H15V4H9V6ZM16 15H8V20H16V15Z" fill="black" fill-opacity="1" /></svg>';
SvgRegistry.registerIcon("icon-saveas", saveAsIcon);

export const useThemeManagement = ({
  formId,
  creator,
  themeId,
  onThemeIdChanged,
  onPostThemeSave,
}: UseThemeManagementProps) => {
  const [isThemeUpdatePending, startTransition] = useTransition();
  const [isCurrentThemeModified, setIsCurrentThemeModified] = useState(false);
  const [currentThemeId, setCurrentThemeId] = useState<string | undefined>(
    themeId,
  );
  const [themeModifiedTracker, setThemeModifiedTracker] = useState<
    Record<string, boolean>
  >({});
  const [originalThemeId] = useState<string | undefined>(themeId);
  const themeManagementInitializedRef = useRef(false);

  const saveTheme = useCallback(
    (saveNo: number, callback: (num: number, status: boolean) => void) => {
      callback(saveNo, true);
    },
    [],
  );

  const getThemes = useCallback(async () => {
    try {
      const result = await getThemesAction();

      if (Result.isError(result)) {
        throw new Error(result.message);
      }

      const parsedThemes = result.value.map((theme) => {
        return {
          ...JSON.parse(theme.jsonData),
          name: theme.name,
          id: theme.id,
        };
      });

      return parsedThemes;
    } catch (error) {
      console.error("Error: ", error);
      return [];
    }
  }, []);

  const createTheme = useCallback(
    async (theme: ITheme): Promise<StoredTheme> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          const result = await createThemeAction(theme);

          if (result === undefined) {
            setIsCurrentThemeModified(false);
            reject(new Error("Could not proceed with creating theme"));
            return;
          }

          if (Result.isError(result)) {
            toast.error(`Failed to create theme: ${result.message}`);
            reject(new Error(result.message));
            return;
          }

          const createdTheme = result.value as {
            id: string;
            name: string;
            jsonData: string;
          };
          const parsedTheme = {
            ...JSON.parse(createdTheme.jsonData),
            name: createdTheme.name,
            id: createdTheme.id,
          };

          toast.success(`Theme "${createdTheme.name}" created successfully`);
          resolve(parsedTheme);
        });
      });
    },
    [startTransition],
  );

  const updateTheme = useCallback(
    async (theme: StoredTheme): Promise<StoredTheme> => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const result = await updateThemeAction({
              themeId: theme.id!,
              theme: theme,
            });

            if (Result.isError(result)) {
              toast.error(`Failed to update theme: ${result.message}`);
              reject(new Error(result.message));
              return;
            }

            const updatedTheme = result.value;
            const parsedTheme = {
              name: updatedTheme.name,
              ...JSON.parse(updatedTheme.jsonData),
            };

            toast.success(`Theme "${updatedTheme.name}" updated successfully`);
            resolve(parsedTheme);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to update theme: ${message}`);
            reject(error);
          }
        });
      });
    },
    [startTransition],
  );

  const deleteTheme = useCallback(
    async (themeId: string) => {
      return new Promise((resolve, reject) => {
        startTransition(async () => {
          try {
            const result = await deleteThemeAction(themeId);

            if (Result.isError(result)) {
              toast.error(`Failed to delete theme: ${result.message}`);
              reject(new Error(result.message));
              return;
            }

            toast.success("Theme deleted successfully");
            resolve(result.value);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to delete theme: ${message}`);
            reject(error);
          }
        });
      });
    },
    [startTransition],
  );

  const handleSaveTheme = useCallback(
    (saveNo: number, callback: (num: number, status: boolean) => void) => {
      saveTheme(saveNo, callback);
    },
    [saveTheme],
  );

  const saveThemeDialog = useCallback(
    (
      dialogTitle: string,
      templateName: string,
      callback: (status: boolean, data?: SaveThemeData) => void,
    ) => {
      const surveyDefinition = JSON.parse(
        `{"pages":[{"name":"page1","elements":[{"type":"html","name":"description","html":"<p class='text-muted-foreground'>You have unsaved changes in the <b>&quot;${templateName}&quot;</b> theme.</p>"},{"type":"boolean","name":"save_as_new","title":"Save theme as new instead?","titleLocation":"hidden","renderAs":"checkbox"},{"type":"text","name":"theme_name","visibleIf":"{save_as_new} = true","title":"Enter the new theme name","requiredIf":"{save_as_new} = true","requiredErrorText":"Theme name is required","placeholder":"New awesome ${templateName}"}]}],"showNavigationButtons":false,"questionErrorLocation":"bottom"}`,
      );

      const survey = new SurveyModel(surveyDefinition);
      survey.isCompact = true;
      const isDefaultTheme = templateName?.toLowerCase() === "default";
      if (isDefaultTheme) {
        const description = survey.getQuestionByName(
          "description",
        ) as QuestionHtmlModel;
        const saveAsNewCheckbox = survey.getQuestionByName(
          "save_as_new",
        ) as QuestionBooleanModel;
        const templateNameInput = survey.getQuestionByName(
          "theme_name",
        ) as QuestionTextModel;

        if (!saveAsNewCheckbox || !templateNameInput || !description) {
          throw new Error("Default theme cannot be edited");
        }

        description.html =
          "<p class='text-muted-foreground'><b>Default theme is reserved.</b> Save as a new theme instead.</p>";

        saveAsNewCheckbox.defaultValue = true;
        saveAsNewCheckbox.readOnly = true;
        const regexValidator = new RegexValidator(
          "^(?![dD][eE][fF][aA][uU][lL][tT]$).+",
        );
        regexValidator.text = "Default is reserved. Choose another name.";
        templateNameInput.validators.push(regexValidator);
      }

      survey.applyTheme(BorderlessLightPanelless);
      const popupViewModel = settings.showDialog(
        {
          componentName: "survey",
          data: { model: survey },
          onApply: () => {
            if (survey.tryComplete()) {
              callback(true, survey.data as SaveThemeData);
              return true;
            }
            return false;
          },
          onCancel: () => {
            callback(false);
            return false;
          },
          title: dialogTitle,
          displayMode: "popup",
          isFocusedContent: true,
          cssClass: "creator-dialog",
        },
        settings.environment.popupMountContainer as HTMLElement,
      );

      const toolbar = popupViewModel.footerToolbar;
      const applyBtn = toolbar.getActionById("apply");
      const cancelBtn = toolbar.getActionById("cancel");
      cancelBtn.title = "Skip theme changes";
      applyBtn.title = "Save theme changes";
    },
    [],
  );

  const addCustomTheme = useCallback(
    (theme: StoredTheme) => {
      creator!.themeEditor!.addTheme(theme);

      if (theme.id === currentThemeId) {
        creator!.theme = theme;
      }
    },
    [creator, currentThemeId],
  );

  const saveThemeHandler = useCallback(async (): Promise<boolean> => {
    const isCurrentThemeModified =
      themeModifiedTracker[currentThemeId!] ?? false;

    if (!isCurrentThemeModified) {
      return false;
    }

    const themeModel = creator?.themeEditor?.themeModel;
    const currentTheme = creator?.theme as StoredTheme;

    const currentThemeFromModel = themeModel
      ? ({
          ...currentTheme,
          ...themeModel.toJSON(),
        } as StoredTheme)
      : currentTheme;

    if (!currentThemeFromModel) {
      return false;
    }

    return new Promise((resolve) => {
      currentThemeFromModel.name =
        currentThemeFromModel.themeName ?? "Custom Theme";
      saveThemeDialog(
        "Theme has unsaved changes",
        currentThemeFromModel.themeName!,
        async (confirm, data) => {
          if (confirm && data) {
            const saveAsNew = data.save_as_new;

            try {
              if (saveAsNew) {
                const newThemeName = data.theme_name;
                const newTheme = {
                  ...currentThemeFromModel,
                  themeName: newThemeName,
                  name: newThemeName,
                };
                const createdTheme = await createTheme(newTheme);
                setCurrentThemeId(createdTheme.id!);
                addCustomTheme(createdTheme);
                setIsCurrentThemeModified(false);
                creator!.themeEditor!.themeModel.setTheme(createdTheme);
              } else {
                await updateTheme(currentThemeFromModel);
                setIsCurrentThemeModified(false);
              }

              await onPostThemeSave?.();
              resolve(true);
            } catch (error) {
              console.error("Error saving theme:", error);
              resolve(false);
            }
          } else {
            resolve(false);
          }
        },
      );
    });
  }, [
    themeModifiedTracker,
    currentThemeId,
    creator,
    saveThemeDialog,
    createTheme,
    addCustomTheme,
    onPostThemeSave,
    updateTheme,
  ]);

  const deleteThemeHandler = useCallback(() => {
    const theme = creator?.theme as StoredTheme;
    if (!creator || !theme) {
      return;
    }

    const themeId = theme.id;
    if (!themeId) {
      return;
    }

    startTransition(async () => {
      const formsWithSameThemeResult = await getFormsForThemeAction(themeId);
      if (Result.isError(formsWithSameThemeResult)) {
        toast.error(formsWithSameThemeResult.message);
        return;
      }

      const otherFormsWithSameTheme = formsWithSameThemeResult.value.filter(
        (form) => form.id !== formId,
      );
      const messageForOtherForms =
        otherFormsWithSameTheme.length > 0
          ? "There are " +
            otherFormsWithSameTheme.length +
            " other forms that use this theme. Do you want to delete the following theme: "
          : "";
      if (otherFormsWithSameTheme.length > 0) {
        const surveyModel = new SurveyModel(
          `{"pages":[{"name":"page1","elements":[{"type":"html","name":"description","html":"<p></p>"}]}],"showNavigationButtons":false, "questionErrorLocation":"bottom"}`,
        );
        surveyModel.applyTheme(BorderlessLightPanelless);
        const description = surveyModel.getQuestionByName(
          "description",
        ) as QuestionHtmlModel;
        const themesMarkup = otherFormsWithSameTheme
          .map(
            (form) =>
              `<li><a href='/forms/${form.id}' target='_blank'>${form.name}</a></li>`,
          )
          .join("");
        description.html =
          "<p class='text-muted-foreground'>Make sure theme is not used by other forms before deleting it. Here is the list of forms that use this theme: <ul class='list-disc list-inside'>" +
          themesMarkup +
          "</ul></p>";
        const themeDeleteNotAllowedPopup = settings.showDialog(
          {
            componentName: "survey",
            data: { model: surveyModel },
            onApply: () => true,
            title: "Cannot delete '" + theme.themeName + "' theme",
            displayMode: "popup",
            cssClass: "creator-dialog",
          },
          settings.environment.popupMountContainer as HTMLElement,
        );
        const actions = themeDeleteNotAllowedPopup.footerToolbar.actions;
        actions.splice(0, actions.length - 1);
        actions[0].title = "OK, I understand";
        return;
      } else {
        settings.confirmActionAsync(
          messageForOtherForms +
            'Do you want to delete the following theme: "' +
            theme.themeName +
            '"?',
          (confirm) => {
            if (confirm) {
              creator?.themeEditor?.removeTheme(theme, true);
              creator!.theme = { themeName: "default" };
              deleteTheme(themeId);
              setIsCurrentThemeModified(false);
            }
          },
          {
            cssClass: "creator-dialog",
          },
        );
      }
    });
  }, [creator, startTransition, formId, deleteTheme]);

  const saveThemeActionBtn = useMemo(
    () =>
      new Action({
        id: "svd-save-custom-theme",
        title: "Add custom theme to the list",
        action: saveThemeHandler,
        iconName: "icon-saveas",
        showTitle: false,
      }),
    [saveThemeHandler],
  );

  const deleteThemeActionBtn = useMemo(
    () =>
      new Action({
        id: "svd-delete-custom-theme",
        title: "Delete theme",
        action: deleteThemeHandler,
        iconName: "icon-delete",
        showTitle: false,
        enabledIf: () => {
          return creator?.theme?.themeName !== "default";
        },
      }),
    [deleteThemeHandler, creator],
  );

  const addActionsToToolbar = useCallback(
    (creator: SurveyCreator) => {
      const saveActionExists = creator.toolbar.actions.some(
        (action) => action.id === "svd-save-custom-theme",
      );
      const deleteActionExists = creator.toolbar.actions.some(
        (action) => action.id === "svd-delete-custom-theme",
      );

      if (!saveActionExists) {
        creator.toolbar.actions.push(saveThemeActionBtn);
      }
      if (!deleteActionExists) {
        creator.toolbar.actions.push(deleteThemeActionBtn);
      }
    },
    [saveThemeActionBtn, deleteThemeActionBtn],
  );

  const handleThemeChanged = useCallback(
    (
      sender: ThemeTabPlugin,
      options: {
        theme: ITheme;
      },
    ) => {
      const selectedThemeId = (options.theme as StoredTheme)?.id;
      if (!selectedThemeId) {
        return;
      }

      setCurrentThemeId(selectedThemeId);
      setIsCurrentThemeModified(themeModifiedTracker[selectedThemeId] ?? false);

      if (selectedThemeId !== originalThemeId) {
        onThemeIdChanged?.(selectedThemeId);
      }
    },
    [themeModifiedTracker, originalThemeId, onThemeIdChanged],
  );

  const handleThemePropertyChanged = useCallback((sender: ThemeTabPlugin) => {
    const currentTheme = sender.getCurrentTheme() as StoredTheme;
    setThemeModifiedTracker((prev) => ({
      ...prev,
      [currentTheme.id!]: true,
    }));

    setIsCurrentThemeModified(true);
  }, []);

  useEffect(() => {
    const removeActionsFromToolbar = (creator: SurveyCreator) => {
      const resetThemeActionIndex = creator.toolbar.actions.findIndex(
        (action) => action.id === "svc-reset-theme",
      );

      if (resetThemeActionIndex !== -1) {
        creator.toolbar.actions.splice(resetThemeActionIndex, 1);
      }
    };

    if (!creator) {
      return;
    }

    if (!themeManagementInitializedRef.current) {
      removeActionsFromToolbar(creator);
      creator.saveThemeFunc = handleSaveTheme;

      creator.onPropertyEditorUpdateTitleActions.add((_, options) => {
        const propertyName = options.property?.name;
        if (propertyName === "themeName") {
          // Check if the delete button already exists to prevent duplicates
          const deleteButtonExists = options.titleActions.some(
            (action: unknown) =>
              (action as { id: string })?.id === "svd-delete-custom-theme",
          );
          if (!deleteButtonExists) {
            options.titleActions.push(deleteThemeActionBtn);
          }
        }
      });

      const themeTabPlugin = creator.themeEditor;
      themeTabPlugin.advancedModeEnabled = true;
      themeTabPlugin.onThemeSelected.add(handleThemeChanged);
      themeTabPlugin.onThemePropertyChanged.add(handleThemePropertyChanged);

      getThemes()
        .then((themes) => {
          themes.forEach((theme: StoredTheme) => {
            addCustomTheme(theme);
          });

          if (creator.theme === null) {
            creator!.theme = DefaultLight;
          }
        })
        .catch((error) => {
          console.error("Error: ", error);
        });

      themeManagementInitializedRef.current = true;
    }

    return () => {
      if (themeManagementInitializedRef.current) {
        creator.saveThemeFunc = null;
        creator.themeEditor.onThemeSelected.remove(handleThemeChanged);
        creator.themeEditor.onThemePropertyChanged.remove(
          handleThemePropertyChanged,
        );
        themeManagementInitializedRef.current = false;
      }
    };
  }, [
    creator,
    addActionsToToolbar,
    handleSaveTheme,
    getThemes,
    addCustomTheme,
    themeId,
    onThemeIdChanged,
    saveThemeActionBtn,
    deleteThemeActionBtn,
    deleteThemeHandler,
    handleThemeChanged,
    handleThemePropertyChanged,
  ]);

  return {
    currentThemeId,
    isCurrentThemeModified,
    isThemeUpdatePending,
    saveThemeHandler,
  };
};
