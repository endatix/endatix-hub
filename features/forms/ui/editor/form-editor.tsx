"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { updateFormNameAction } from "@/features/forms/application/actions/update-form-name.action";
import {
  initializeCustomQuestions,
  SpecializedSurveyQuestionType,
} from "@/lib/questions/infrastructure/specialized-survey-question";
import type { Question } from "survey-core";
import { Result } from "@/lib/result";
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
  SurveyModel,
  SvgRegistry,
  JsonObject,
} from "survey-core";
import "survey-core/survey-core.css";
import { BorderlessLightPanelless, DefaultLight } from "survey-core/themes";
import {
  getLocaleStrings,
  ICreatorOptions,
  registerSurveyTheme,
  SurveyCreatorModel,
  UploadFileEvent,
} from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { createThemeAction } from "../../application/actions/create-theme.action";
import { deleteThemeAction as removeThemeAction } from "../../application/actions/delete-theme.action";
import { getFormsForThemeAction } from "../../application/actions/get-forms-for-theme.action";
import { getThemesAction } from "../../application/actions/get-themes.action";
import { updateFormDefinitionJsonAction } from "../../application/actions/update-form-definition-json.action";
import { updateFormThemeAction } from "../../application/actions/update-form-theme.action";
import { updateThemeAction } from "../../application/actions/update-theme.action";
import { StoredTheme } from "../../domain/models/theme";
import { getCustomQuestionsAction } from "../../application/actions/get-custom-questions.action";
import { CreateCustomQuestionRequest } from "@/services/api";
import { createCustomQuestionAction } from "../../application/actions/create-custom-question.action";
import "survey-core/i18n";
import "survey-creator-core/i18n";
import { endatixTheme } from "@/components/editors/endatix-theme";

Serializer.addProperty("theme", {
  name: "id",
  type: "string",
  category: "general",
  visible: false,
});

Serializer.addProperty("survey", {
  name: "fileNamesPrefix",
  displayName: "File names prefix",
  type: "expression",
  category: "downloadSettings",
  categoryIndex: 901,
  visibleIndex: 0,
  isLocalizable: true,
});

const translations = getLocaleStrings("en");
translations.pehelp.fileNamesPrefix =
  "Set a prefix for the downloaded submission files using an expression. <br/>" +
  "You can reference question values with curly braces, e.g. <em>{gender}</em> or <em>{age}</em>. Example: <br/>" +
  "<b>Example:</b> <input disabled name='example-expression' class='spg-comment spg-text p-1' value='{gender} + \"-\" + {age}'></input><br/>" +
  'creates file names like <em>"male-25-q1.pdf"</em> or <em>"female-30-profilePic-2.png"</em><br/>' +
  "This helps organize files by including specific answers provided by the respondent in the file name.<br/><br/>" +
  "<b>Note:</b> The expression is evaluated for each submission prior to donwloading the files provided by the respondent. The unique question's name, for which the file was uploaded is always added to the filename.<br/><br/>" +
  "For more information on how to write expression, see <a class='hover:underline' href='https://surveyjs.io/survey-creator/documentation/end-user-guide/expression-syntax'>Expression Syntax</a>.";

const downloadSettingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-down-icon lucide-folder-down"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="m15 13-3 3-3-3"/></svg>`;
SvgRegistry.registerIcon("icon-download-settings", downloadSettingsIcon);

const saveAsIcon =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d = "M24 11H22V13H20V11H18V9H20V7H22V9H24V11ZM20 14H22V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V4L4 2H20C21.1 2 22 2.9 22 4V6H20V4H17V8H7V4H4.83L4 4.83V20H6V13H18V20H20V14ZM9 6H15V4H9V6ZM16 15H8V20H16V15Z" fill="black" fill-opacity="1" /></svg>';
SvgRegistry.registerIcon("icon-saveas", saveAsIcon);
registerSurveyTheme(DefaultLight);

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

const defaultCreatorOptions: ICreatorOptions = {
  showPreview: true,
  showJSONEditorTab: true,
  showTranslationTab: true,
  showDesignerTab: true,
  showLogicTab: true,
  showThemeTab: true,
  themeForPreview: "Default",
};

function nameToTitle(name: string): string {
  const words = name
    .split(/[_\s-]+/)
    .flatMap((word) => word.split(/(?=[A-Z])/))
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return words.join(" ");
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [questionClasses, setQuestionClasses] = useState<
    SpecializedSurveyQuestionType[]
  >([]);

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
          try {
            const result = await createThemeAction(theme);

            if (Result.isError(result)) {
              toast.error(`Failed to create theme: ${result.message}`);
              reject(new Error(result.message));
              return;
            }

            const createdTheme = result.value;
            const parsedTheme = {
              ...JSON.parse(createdTheme.jsonData),
              name: createdTheme.name,
              id: createdTheme.id,
            };

            toast.success(`Theme "${createdTheme.name}" created successfully`);
            resolve(parsedTheme);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            toast.error(`Failed to create theme: ${message}`);
            reject(error);
          }
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
              themeId: theme.id,
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
            const result = await removeThemeAction(themeId);

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
      cancelBtn.title = "Cancel";
      applyBtn.title = "OK";
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
  }, [creator, saveThemeDialog, addCustomTheme, createTheme, updateTheme]);

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
    });
  }, [creator, formId, deleteTheme]);

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
      }),
    [deleteThemeHandler],
  );

  const updateCustomActions = useCallback(() => {
    if (!creator) {
      return;
    }

    const isThemeTab = creator.activeTab === "theme";
    saveThemeActionBtn.visible = isThemeTab;

    // TODO: Implement proper theme name/id lookup
    const currentThemeName = creator.theme?.themeName;
    const isCustomTheme = currentThemeName != "default";

    deleteThemeActionBtn.visible = isThemeTab && isCustomTheme;
  }, [creator, saveThemeActionBtn, deleteThemeActionBtn]);

  const saveCustomQuestion = useCallback(
    async (element: Question, questionName: string, questionTitle: string) => {
      try {
        const json = new JsonObject().toJsonObject(element);

        const baseJsonData = {
          name: questionName,
          title: questionTitle,
          iconName: "icon-" + element.getType(),
          category: "custom",
          defaultQuestionTitle: questionTitle,
          inheritBaseProps: true,
        };

        const request: CreateCustomQuestionRequest = {
          name: questionName,
          description: questionTitle,
          jsonData: JSON.stringify({
            ...baseJsonData,
            ...(element.getType() === "panel"
              ? { elementsJSON: json.elements }
              : {
                  questionJSON: {
                    ...json,
                    type: element.getType(),
                  },
                }),
          }),
        };

        const result = await createCustomQuestionAction(request);
        if (Result.isError(result)) {
          throw new Error(result.message);
        }

        const savedQuestion = result.value;
        const parsedJson = JSON.parse(savedQuestion.jsonData);

        const questionClasses = initializeCustomQuestions([
          savedQuestion.jsonData,
        ]);
        if (questionClasses.length > 0) {
          creator?.toolbox.addItem({
            name: savedQuestion.name,
            title: parsedJson.title,
            iconName: parsedJson.iconName,
            json: {
              type: savedQuestion.name,
              name: savedQuestion.name,
            },
            category: parsedJson.category,
          });
        }

        toast.success("Custom question saved and added to toolbox");
      } catch (error) {
        console.error("Error saving custom question:", error);
        toast.error("Failed to save custom question");
      }
    },
    [creator],
  );

  const createCustomQuestionDialog = useCallback(
    async (element: Question) => {
      try {
        const isDefaultName = element.name.match(/^(question|panel)\d+$/);
        const defaultTitle = isDefaultName ? "" : nameToTitle(element.name);

        const surveyDefinition = JSON.parse(
          `{"pages":[{"name":"page1","elements":[
          {"type":"html","name":"description","html":"<p class='text-muted-foreground'>You are about to save <b>&quot;${
            element.name
          }&quot;</b> as a custom question.</p>"},
          {"type":"text","name":"question_name","title":"Enter a unique name for the custom question","requiredIf":"true","requiredErrorText":"Question name is required","placeholder":"${
            isDefaultName ? "" : element.name
          }","defaultValue":"${isDefaultName ? "" : element.name}"},
          {"type":"text","name":"question_title","title":"Enter the custom question title","requiredIf":"true","requiredErrorText":"Question title is required","placeholder":"${defaultTitle}","defaultValue":"${defaultTitle}"}
        ]}],"showNavigationButtons":false,"questionErrorLocation":"bottom","requiredText":"*"}`,
        );

        const survey = new SurveyModel(surveyDefinition);
        survey.isCompact = true;
        survey.applyTheme(BorderlessLightPanelless);

        settings.showDialog(
          {
            componentName: "survey",
            data: { model: survey },
            onApply: () => {
              if (survey.tryComplete()) {
                saveCustomQuestion(
                  element,
                  survey.data.question_name,
                  survey.data.question_title,
                );
                return true;
              }
              return false;
            },
            onCancel: () => {
              return false;
            },
            title: "Create Custom Question",
            displayMode: "popup",
            isFocusedContent: true,
            cssClass: "creator-dialog",
          },
          settings.environment.popupMountContainer as HTMLElement,
        );
      } catch (error) {
        console.error("Error saving custom question:", error);
        toast.error("Failed to save custom question");
      }
    },
    [saveCustomQuestion],
  );

  useEffect(() => {
    if (!creator) return;

    questionClasses.forEach((QuestionClass) => {
      QuestionClass.customizeEditor(creator);
    });
  }, [creator, questionClasses]);

  useEffect(() => {
    const initializeNewCreator = async () => {
      if (creator) return;

      if (slkVal) {
        slk(slkVal);
      }

      try {
        const result = await getCustomQuestionsAction();
        if (Result.isError(result)) {
          throw new Error(result.message);
        }

        const newQuestionClasses = initializeCustomQuestions(
          result.value.map((q) => q.jsonData),
        );

        const newCreator = new SurveyCreator(options || defaultCreatorOptions);
        newCreator.applyCreatorTheme(endatixTheme);
        newCreator.onUploadFile.add(handleUploadFile);
        newCreator.activatePropertyGridCategory("creatorSettings");
        newCreator.onSurveyInstanceCreated.add((creator, options) => {
          if (options.area === "property-grid") {
            const downloadSettingsCategory =
              options.survey.getPageByName("downloadSettings");
            if (downloadSettingsCategory) {
              (
                downloadSettingsCategory as unknown as { iconName: string }
              ).iconName = "icon-download-settings";
              downloadSettingsCategory.title = "Download Settings";
            }
          }
        });

        setCreator(newCreator);
        if (newQuestionClasses.length > 0) {
          setQuestionClasses(newQuestionClasses);
        }
      } catch (error) {
        console.error("Error loading custom questions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNewCreator();
  }, [options, slkVal, handleUploadFile, creator]);

  useEffect(() => {
    if (creator && formJson) {
      creator.JSON = formJson;
    }
  }, [creator, formJson]);

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
    if (!creator) return;

    creator.onElementGetActions.add((_, options) => {
      const element = options.element as Question;
      if (element?.isQuestion) {
        options.actions.unshift({
          id: "create-custom-question",
          title: "Create Custom Question",
          iconName: "icon-toolbox",
          action: () => createCustomQuestionDialog(element),
        });
      }
    });

    return () => {
      creator.onElementGetActions.remove((_, options) => {
        const element = options.element as Question;
        if (element?.isQuestion) {
          options.actions = options.actions.filter(
            (action) => action.id !== "create-custom-question",
          );
        }
      });
    };
  }, [creator, createCustomQuestionDialog]);

  useEffect(() => {
    const setAsModified = () => {
      setHasUnsavedChanges(true);
    };
    if (creator) {
      creator.onModified.add(setAsModified);
      creator.saveThemeFunc = handleSaveTheme;
      creator.onActiveTabChanged.add(updateCustomActions);
      creator.toolbar.actions.push(saveThemeActionBtn);
      creator.toolbar.actions.push(deleteThemeActionBtn);

      const themeTabPlugin = creator.themeEditor;
      themeTabPlugin.advancedModeEnabled = true;
      themeTabPlugin.onThemeSelected.add(() => {
        if ((creator.theme as StoredTheme)?.id !== themeId) {
          setHasUnsavedChanges(true);
        } else {
          setHasUnsavedChanges(false);
        }
        updateCustomActions();
      });

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
    deleteThemeActionBtn,
    saveThemeActionBtn,
    themeId,
    saveThemeHandler,
    deleteThemeHandler,
    addCustomTheme,
    updateCustomActions,
    handleSaveTheme,
    getThemes,
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
        {isLoading ? (
          <div className="flex items-center justify-center h-[calc(100vh-80px)]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground">Loading designer...</p>
            </div>
          </div>
        ) : creator ? (
          <SurveyCreatorComponent creator={creator} />
        ) : (
          <div>Error loading form editor</div>
        )}
      </div>
    </>
  );
}
export default FormEditor;
export type { FormEditorProps };
