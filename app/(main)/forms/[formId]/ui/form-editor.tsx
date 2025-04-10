"use client";

import { updateFormNameAction } from "@/app/(main)/forms/[formId]/update-form-name.action";
import { StoredTheme } from "@/app/api/hub/v0/themes/theme";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { registerSpecializedQuestion, SpecializedVideo } from "@/lib/questions";
import { ThemeResponse } from "@/services/api";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
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
  slk,
  surveyLocalization,
  SurveyModel,
  SvgRegistry,
} from "survey-core";
import "survey-core/survey-core.css";
import { BorderlessLightPanelless, DefaultLight } from "survey-core/themes";
import {
  ICreatorOptions,
  PredefinedThemes,
  registerSurveyTheme,
  SurveyCreatorModel,
  UploadFileEvent,
} from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import SurveyCreatorTheme from "survey-creator-core/themes";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { updateFormDefinitionJsonAction } from "../update-form-definition-json.action";
import { updateFormThemeAction } from "../update-form-theme.action";

Serializer.addProperty("theme", {
  name: "id",
  type: "string",
  category: "general",
  visible: false,
});

const saveAsIcon =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d = "M24 11H22V13H20V11H18V9H20V7H22V9H24V11ZM20 14H22V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V4L4 2H20C21.1 2 22 2.9 22 4V6H20V4H17V8H7V4H4.83L4 4.83V20H6V13H18V20H20V14ZM9 6H15V4H9V6ZM16 15H8V20H16V15Z" fill="black" fill-opacity="1" /></svg>';
SvgRegistry.registerIcon("icon-saveas", saveAsIcon);
registerSurveyTheme(DefaultLight);
registerSpecializedQuestion(SpecializedVideo);

interface FormEditorProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
}

interface SaveThemeData {
  save_as_new: boolean;
  theme_name: string;
}

const getThemes = async () => {
  try {
    const response = await fetch("/api/hub/v0/themes");

    if (!response.ok) {
      throw new Error("Failed to fetch themes");
    }

    const data = (await response.json()) as ThemeResponse[];
    if (!data) {
      throw new Error("Failed to fetch themes");
    }

    const parsedThemes = data.map((theme: ThemeResponse) => {
      return {
        name: theme.name,
        id: theme.id,
        ...JSON.parse(theme.jsonData),
      };
    });

    return parsedThemes;
  } catch (error) {
    console.error("Error: ", error);
    return [];
  }
};

const createTheme = async (theme: ITheme): Promise<StoredTheme> => {
  const response = await fetch(`/api/hub/v0/themes`, {
    method: "POST",
    body: JSON.stringify(theme),
  });

  if (!response.ok) {
    throw new Error("Failed to create theme");
  }

  const createdTheme = (await response.json()) as ThemeResponse;
  if (!createdTheme) {
    throw new Error("Failed to create theme");
  }

  return {
    name: createdTheme.name,
    id: createdTheme.id,
    ...JSON.parse(createdTheme.jsonData),
  };
};

const updateTheme = async (theme: StoredTheme): Promise<StoredTheme> => {
  const response = await fetch(`/api/hub/v0/themes/${theme.id}`, {
    method: "PUT",
    body: JSON.stringify(theme),
  });

  if (!response.ok) {
    throw new Error("Failed to update theme");
  }

  return response.json();
};

const deleteTheme = async (themeId: string) => {
  const response = await fetch(`/api/hub/v0/themes/${themeId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete theme");
  }

  return response.json();
};

const defaultCreatorOptions: ICreatorOptions = {
  showPreview: true,
  showJSONEditorTab: true,
  showTranslationTab: true,
  showDesignerTab: true,
  showLogicTab: true,
  showThemeTab: true,
  themeForPreview: "Default",
};

function FormEditor({
  formJson,
  formId,
  formName,
  options,
  slkVal,
  themeId,
}: FormEditorProps) {
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const [isSaving] = useState(false);
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(formName === "New Form");
  const [name, setName] = useState(formName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [originalName, setOriginalName] = useState(formName);
  const [isPending, startTransition] = useTransition();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleNameSave = useCallback(async () => {
    if (name !== originalName) {
      startTransition(async () => {
        await updateFormNameAction(formId, name);

        setOriginalName(name);
        setName(name);
        toast.success("Form name updated");
      });
    }
    setIsEditingName(false);
  }, [formId, name, originalName, startTransition]);

  const handleUploadFile = useCallback(
    async (_: SurveyCreatorModel, options: UploadFileEvent) => {
      const formData = new FormData();
      options.files.forEach(function (file: File) {
        formData.append("file", file);
      });

      fetch("/api/hub/v0/storage/upload", {
        method: "POST",
        body: formData,
        headers: {
          "edx-form-id": formId,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          options.callback("success", data.url);
        })
        .catch((error) => {
          console.error("Error: ", error);
          options.callback("error", undefined);
        });
    },
    [formId],
  );

  const saveTheme = useCallback(
    (saveNo: number, callback: (num: number, status: boolean) => void) => {
      debugger;
      callback(saveNo, true);
    },
    [],
  );

  const handleSaveTheme = useCallback(
    (saveNo: number, callback: (num: number, status: boolean) => void) => {
      debugger;
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
        `{"pages":[{"name":"page1","elements":[{"type":"html","name":"description","html":"<p class='text-muted-foreground'>You are about to make changes to the <b>&quot;${templateName}&quot;</b> theme.</p>"},{"type":"boolean","name":"save_as_new","title":"Save theme as new instead?","titleLocation":"hidden","renderAs":"checkbox"},{"type":"text","name":"theme_name","visibleIf":"{save_as_new} = true","title":"Enter the new theme name","requiredIf":"{save_as_new} = true","requiredErrorText":"Theme name is required","placeholder":"New awesome ${templateName}"}]}],"showNavigationButtons":false,"questionErrorLocation":"bottom"}`,
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
      cancelBtn.title = surveyLocalization.getString("cancel");
      applyBtn.title = surveyLocalization.getString("ok");
    },
    [],
  );

  const addCustomTheme = useCallback(
    (theme: ITheme) => {
      const themeTabPlugin = creator!.themeEditor!;
      themeTabPlugin.addTheme(theme);
    },
    [creator],
  );

  const saveThemeHandler = useCallback(() => {
    const currentTheme = creator?.theme as StoredTheme;
    currentTheme.name = currentTheme.themeName ?? "Custom Theme";

    if (!currentTheme) {
      return;
    }

    saveThemeDialog(
      "Do you want to save the current theme?",
      currentTheme.themeName!,
      (confirm, data) => {
        if (confirm && data) {
          const saveAsNew = data.save_as_new;

          if (saveAsNew) {
            // create new theme
            const newThemeName = data.theme_name;
            const newTheme = {
              ...currentTheme,
              themeName: newThemeName,
              name: newThemeName,
            };
            createTheme(newTheme)
              .then((createdTheme) => {
                addCustomTheme(createdTheme);
                const themeTabPlugin = creator!.themeEditor!;
                const themeModel = themeTabPlugin.themeModel;
                themeModel.setTheme(createdTheme);
              })
              .catch((error) => {
                console.error("Error creating new theme: ", error);
              });
          } else {
            updateTheme(currentTheme)
              .then((updatedTheme) => {
                console.log("Updated theme: ", updatedTheme);
              })
              .catch((error) => {
                console.error("Error updating theme: ", error);
              });
          }
        }
      },
    );
  }, [creator, saveThemeDialog, addCustomTheme]);

  const deleteThemeHandler = useCallback(() => {
    const theme = creator?.theme as StoredTheme;
    if (!creator || !theme) {
      return;
    }

    const themeId = theme.id;
    if (!themeId) {
      return;
    }

    const builtInThemeIndex = PredefinedThemes.indexOf(themeId);
    if (builtInThemeIndex === -1) {
      settings.confirmActionAsync(
        'Do you want to delete the following theme: "' + theme.themeName + '"?',
        (confirm) => {
          if (confirm) {
            const themeTabPlugin = creator?.themeEditor;
            themeTabPlugin.removeTheme(theme, true);
            const themeModel = themeTabPlugin.themeModel;
            themeModel.setTheme({ themeName: "default" });
            deleteTheme(themeId);
          }
        },
        {
          cssClass: "creator-dialog",
        },
      );
    }
  }, [creator]);

  const saveThemeAction = useMemo(
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

  const deleteThemeAction = useMemo(
    () =>
      new Action({
        id: "svd-delete-custom-theme",
        title: "Delete theme",
        action: deleteThemeHandler,
        iconName: "icon-delete",
        showTitle: false,
      }),
    [deleteThemeHandler],
  );

  const updateCustomActions = useCallback(() => {
    if (!creator) {
      return;
    }

    const isThemeTab = creator.activeTab === "theme";
    saveThemeAction.visible = isThemeTab;

    // TODO: Implement proper theme name/id lookup
    const currentThemeName = creator.theme?.themeName;
    const isCustomTheme = currentThemeName != "default";

    deleteThemeAction.visible = isThemeTab && isCustomTheme;
  }, [creator, saveThemeAction, deleteThemeAction]);

  useEffect(() => {
    if (creator) {
      creator.JSON = formJson;
      return;
    }

    if (slkVal) {
      slk(slkVal);
    }

    const newCreator = new SurveyCreator(options || defaultCreatorOptions);
    SpecializedVideo.customizeEditor(newCreator);

    newCreator.applyCreatorTheme(SurveyCreatorTheme.DefaultContrast);
    newCreator.JSON = formJson;
    newCreator.onUploadFile.add(handleUploadFile);

    setCreator(newCreator);
  }, [formJson, options, creator, slkVal, handleUploadFile]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setTimeout(() => {
          handleNameSave();
        }, 0);
      }
    };

    if (isEditingName) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside); // Clean up event listener
    };
  }, [isEditingName, handleNameSave]);

  useEffect(() => {
    const setAsModified = () => {
      setHasUnsavedChanges(true);
    };
    if (creator) {
      creator.onModified.add(setAsModified);
      creator.saveThemeFunc = handleSaveTheme;
      creator.onActiveTabChanged.add(updateCustomActions);
      creator.toolbar.actions.push(saveThemeAction);
      creator.toolbar.actions.push(deleteThemeAction);
      creator.activeTab = "theme";

      const themeTabPlugin = creator.themeEditor;
      themeTabPlugin.advancedModeEnabled = true;
      themeTabPlugin.onThemeSelected.add(setAsModified);
      themeTabPlugin.onThemePropertyChanged.add(setAsModified);
      themeTabPlugin.onThemeSelected.add(updateCustomActions);

      getThemes()
        .then((themes) => {
          themes.forEach((theme: StoredTheme) => {
            addCustomTheme(theme);
            if (theme.id === themeId) {
              themeTabPlugin.themeModel.setTheme(theme);
            }
          });

          if (creator.theme === null) {
            themeTabPlugin.themeModel.setTheme(DefaultLight);
          }

          updateCustomActions();
        })
        .catch((error) => {
          console.error("Error: ", error);
        });

      updateCustomActions();

      return () => {
        creator.onModified.remove(setAsModified);
        creator.saveThemeFunc = null;
        creator.onActiveTabChanged.remove(updateCustomActions);
        themeTabPlugin.onThemeSelected.remove(updateCustomActions);
        themeTabPlugin.onThemePropertyChanged.remove(updateCustomActions);
      };
    }
  }, [
    creator,
    deleteThemeAction,
    saveThemeAction,
    themeId,
    saveThemeHandler,
    deleteThemeHandler,
    addCustomTheme,
    updateCustomActions,
    handleSaveTheme,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  const handleSaveAndGoBack = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        "There are unsaved changes. Are you sure you want to leave?",
      );
      if (confirm) {
        router.push("/forms");
      }
    } else {
      router.push("/forms");
    }
  };

  const saveForm = () => {
    startTransition(async () => {
      const isDraft = false;
      const updatedFormJson = creator?.JSON;
      const theme = creator?.theme as StoredTheme;
      let isThemeUpdated = false;
      let isFormUpdated = false;

      const updateDefinitionResult = await updateFormDefinitionJsonAction(
        formId,
        isDraft,
        updatedFormJson,
      );

      if (updateDefinitionResult.success) {
        isFormUpdated = true;
      } else {
        throw new Error(updateDefinitionResult.error);
      }

      if (theme.id !== themeId) {
        const updateThemeResult = await updateFormThemeAction(formId, theme.id);
        if (updateThemeResult.success) {
          isThemeUpdated = true;
        } else {
          throw new Error(updateThemeResult.error);
        }
      }

      setHasUnsavedChanges(false);
      toast.success(
        <p>
          {isFormUpdated && "Form saved. "}
          {isThemeUpdated && (
            <span>
              Form theme set to <b>{theme.themeName}</b>
            </span>
          )}
        </p>,
      );
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setName(originalName);
      setIsEditingName(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mt-0 pt-4 pb-4 sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex w-full items-center gap-8">
          <button
            onClick={handleSaveAndGoBack}
            className="mr-0 text-2xl flex items-center"
            disabled={isSaving}
            style={{ border: "none", background: "transparent" }}
          >
            ←
          </button>

          {isEditingName ? (
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)} // Update the name when typing
              onKeyDown={handleKeyDown} // Handle Enter and Esc key presses
              className="font-bold text-lg border border-gray-300 rounded"
              autoFocus
            />
          ) : (
            <span
              className="font-bold text-lg hover:border hover:border-gray-300 hover:rounded px-1"
              onClick={() => setIsEditingName(true)}
              style={{ cursor: "text" }}
            >
              {name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="font-bold text-black text-xs border border-black px-2 py-0.5 rounded-full whitespace-nowrap">
              Unsaved changes
            </span>
          )}
          <Button
            disabled={isPending}
            onClick={saveForm}
            variant="default"
            size="sm"
            className="h-8 border-dashed"
          >
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
      <div id="creator">
        {creator ? (
          <SurveyCreatorComponent creator={creator} />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </>
  );
}
export default FormEditor;
export type { FormEditorProps };
