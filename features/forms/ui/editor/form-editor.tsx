"use client";

import { toast } from "@/components/ui/toast";
import {
  initializeCustomQuestions,
  SpecializedSurveyQuestionType,
} from "@/lib/questions/infrastructure/specialized-survey-question";
import type { Question } from "survey-core";
import { Result } from "@/lib/result";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
  TabJsonEditorTextareaPlugin,
  UploadFileEvent,
} from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { updateFormDefinitionJsonAction } from "../../application/actions/update-form-definition-json.action";
import { updateFormThemeAction } from "../../application/actions/update-form-theme.action";
import { StoredTheme } from "../../domain/models/theme";
import { getCustomQuestionsAction } from "../../application/actions/get-custom-questions.action";
import { CreateCustomQuestionRequest } from "@/services/api";
import { createCustomQuestionAction } from "../../application/actions/create-custom-question.action";
import "survey-core/i18n";
import "survey-creator-core/i18n";
import { endatixTheme } from "@/components/editors/endatix-theme";
import { useThemeManagement } from "@/features/public-form/application/use-theme-management.hook";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { customQuestions } from "@/customizations/questions/question-registry";
import { registerAudioQuestionUI } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import { useRichTextEditing } from "@/lib/survey-features/rich-text";

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
  visibleIndex: 1,
  isLocalizable: true,
});

registerAudioQuestionUI();
addRandomizeGroupFeature();

const translations = getLocaleStrings("en");

translations.pehelp.fileNamesPrefix =
  "Set a prefix for the downloaded submission files using an expression. <br/>" +
  "You can reference question values with curly braces, e.g. <em>{gender}</em> or <em>{age}</em>. Example: <br/>" +
  "<b>Example:</b> <input disabled name='example-expression' class='spg-comment spg-text p-1' value='{gender} + \"-\" + {age}'></input><br/>" +
  'creates file names like <em>"male-25-q1.pdf"</em> or <em>"female-30-profilePic-2.png"</em><br/>' +
  "This helps organize files by including specific answers provided by the respondent in the file name.<br/><br/>" +
  "<b>Note:</b> The expression is evaluated for each submission prior to donwloading the files provided by the respondent. The unique question's name, for which the file was uploaded is always added to the filename.<br/><br/>" +
  "For more information on how to write expression, see <a target='_blank' class='hover:underline' href='https://surveyjs.io/survey-creator/documentation/end-user-guide/expression-syntax'>Expression Syntax</a>.";

const downloadSettingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-down-icon lucide-folder-down"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="m15 13-3 3-3-3"/></svg>`;
SvgRegistry.registerIcon("icon-download-settings", downloadSettingsIcon);

const invalidJsonErrorMessage =
  "Invalid JSON! Please fix all errors in the JSON editor before saving.";

registerSurveyTheme(DefaultLight);

interface FormEditorProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
  initialPropertyGridVisible?: boolean;
  hasUnsavedChanges?: boolean;
  onUnsavedChanges?: (hasChanges: boolean) => void;
  onThemeModificationChange?: (isModified: boolean) => void;
  onSaveHandlerReady?: (saveHandler: () => Promise<void>) => void;
  onPropertyGridControllerReady?: (
    controller: (visible: boolean) => void,
  ) => void;
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
  options,
  slkVal,
  themeId,
  initialPropertyGridVisible = true,
  hasUnsavedChanges = false,
  onUnsavedChanges,
  onThemeModificationChange,
  onSaveHandlerReady,
  onPropertyGridControllerReady,
}: FormEditorProps) {
  const isCreatorInitializedRef = useRef(false);
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionClasses, setQuestionClasses] = useState<
    SpecializedSurveyQuestionType[]
  >([]);
  const handleThemeIdChanged = useCallback(() => {
    onUnsavedChanges?.(true);
  }, [onUnsavedChanges]);
  useRichTextEditing(creator);

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

  const saveCustomQuestion = useCallback(
    async (element: Question, questionName: string, questionTitle: string) => {
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
      if (result === undefined || Result.isError(result)) {
        toast.error(result?.message || "Failed to save custom question");
        return;
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
    },
    [creator],
  );

  const getJsonForSaving = useCallback(() => {
    if (creator?.activeTab === "json") {
      const errorsList = document.querySelector(
        ".svc-json-editor-tab__errros_list",
      ) as HTMLElement;
      const errorsContainer = document.querySelector(
        ".svc-json-errors",
      ) as HTMLElement;

      const isErrorsListVisible =
        errorsList && getComputedStyle(errorsList).display !== "none";
      const hasErrorChildren =
        errorsContainer && errorsContainer.children.length > 0;

      if (isErrorsListVisible && hasErrorChildren) {
        toast.error(invalidJsonErrorMessage);
        return null;
      }

      const jsonAreaPlugin = creator.getPlugin(
        "json",
      ) as TabJsonEditorTextareaPlugin;
      try {
        return JSON.parse(jsonAreaPlugin.model.text);
      } catch (error) {
        toast.error(invalidJsonErrorMessage);
        return null;
      }
    } else {
      return creator?.JSON;
    }
  }, [creator]);

  const saveForm = useCallback(async () => {
    const isDraft = false;

    const updatedFormJson = getJsonForSaving();
    if (updatedFormJson === null) {
      return;
    }
    const theme = creator?.theme as StoredTheme;
    let isThemeUpdated = false;
    let isFormUpdated = false;

    const updateDefinitionResult = await updateFormDefinitionJsonAction(
      formId,
      isDraft,
      updatedFormJson,
    );

    if (updateDefinitionResult === undefined) {
      toast.error("Could not proceed with updating form definition");
      return;
    }

    if (Result.isError(updateDefinitionResult)) {
      toast.error(
        updateDefinitionResult.message || "Failed to update form definition",
      );
      return;
    }

    isFormUpdated = true;

    if (theme.id !== themeId) {
      const updateThemeResult = await updateFormThemeAction({
        formId,
        themeId: theme.id,
      });

      if (updateThemeResult === undefined) {
        toast.error("Could not proceed with updating form theme");
        return;
      }

      if (!updateThemeResult.success) {
        toast.error(updateThemeResult.error || "Failed to update form theme");
        return;
      }

      isThemeUpdated = true;
    }

    onUnsavedChanges?.(false);
    toast.success(
      <p>
        {isFormUpdated && "Form changes saved. "}
        {isThemeUpdated && (
          <span>
            Theme set to <b>{theme.themeName}</b>
          </span>
        )}
      </p>,
    );
  }, [getJsonForSaving, creator?.theme, formId, themeId, onUnsavedChanges]);

  const { saveThemeHandler, isCurrentThemeModified } = useThemeManagement({
    formId,
    creator,
    themeId,
    onThemeIdChanged: handleThemeIdChanged,
    onPostThemeSave: saveForm,
  });

  const saveFormHandler = useCallback(async () => {
    if (!hasUnsavedChanges && !isCurrentThemeModified) {
      toast.info("Nothing to save");
      return;
    }

    const isThemeSavedFlow = await saveThemeHandler();

    if (!isThemeSavedFlow) {
      await saveForm();
    }
  }, [hasUnsavedChanges, isCurrentThemeModified, saveThemeHandler, saveForm]);

  useEffect(() => {
    onThemeModificationChange?.(isCurrentThemeModified);
  }, [isCurrentThemeModified, onThemeModificationChange]);

  // Provide save handler to parent
  useEffect(() => {
    onSaveHandlerReady?.(saveFormHandler);
  }, [saveFormHandler, onSaveHandlerReady]);

  // Provide property grid controller to parent
  useEffect(() => {
    if (!creator) return;

    const propertyGridController = (visible: boolean) => {
      if (creator.showSidebar !== undefined) {
        creator.showSidebar = visible;
      }
    };

    onPropertyGridControllerReady?.(propertyGridController);
  }, [creator, onPropertyGridControllerReady]);

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
      if (creator || isCreatorInitializedRef.current) {
        return;
      }

      if (slkVal) {
        slk(slkVal);
      }

      // Load built-in custom questions (from database)
      const result = await getCustomQuestionsAction();

      if (result === undefined) {
        toast.error("Could not proceed with fetching custom questions");
        return;
      }

      try {
        if (Result.isError(result)) {
          throw new Error(result.message);
        }

        const newQuestionClasses = initializeCustomQuestions(
          result.value.map((q) => q.jsonData),
        );

        // Load dynamic questions using greedy loading strategy (load all custom questions for now)
        for (const questionName of customQuestions) {
          try {
            await questionLoaderModule.loadQuestion(questionName);
            console.debug(`✅ Loaded custom question: ${questionName}`);
          } catch (error) {
            console.warn(
              `⚠️ Failed to load custom question: ${questionName}`,
              error,
            );
          }
        }

        const creatorOptions = {
          ...(options || defaultCreatorOptions),
          showSidebar: initialPropertyGridVisible,
        };
        const newCreator = new SurveyCreator(creatorOptions);
        newCreator.applyCreatorTheme(endatixTheme);
        newCreator.onUploadFile.add(handleUploadFile);
        newCreator.onSurveyInstanceCreated.add((_, options) => {
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

        if (newQuestionClasses.length > 0) {
          setQuestionClasses(newQuestionClasses);
        }

        setCreator(newCreator);
        isCreatorInitializedRef.current = true;
      } catch (error) {
        console.error("Error loading custom questions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNewCreator();
  }, [
    options,
    slkVal,
    handleUploadFile,
    creator,
    initialPropertyGridVisible,
    formJson,
  ]);

  useEffect(() => {
    if (!creator) return;

    creator.onElementGetActions.add((_, options) => {
      const element = options.element as Question;
      if (element?.isQuestion || element?.isPanel) {
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
        if (element?.isQuestion || element?.isPanel) {
          options.actions = options.actions.filter(
            (action) => action.id !== "create-custom-question",
          );
        }
      });
    };
  }, [creator, createCustomQuestionDialog]);

  useEffect(() => {
    let isLeavingJsonTab = false;

    const setAsModified = () => {
      if (isLeavingJsonTab) {
        return;
      }

      onUnsavedChanges?.(true);
    };

    const attachJsonTextareaListener = (jsonTextarea: HTMLTextAreaElement) => {
      if (!(jsonTextarea as any).__handlerAttached) {
        const handleInput = () => {
          onUnsavedChanges?.(true);
        };

        jsonTextarea.addEventListener("input", handleInput);

        (jsonTextarea as any).__handlerAttached = true;
        (jsonTextarea as any).__inputHandler = handleInput;
      }
    };

    const waitForTextarea = (attempt = 1, maxAttempts = 4) => {
      const textarea = document.querySelector(
        ".svc-json-editor-tab__content-area",
      ) as HTMLTextAreaElement;
      if (textarea) {
        attachJsonTextareaListener(textarea);
      } else if (attempt < maxAttempts) {
        const delay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms, 800ms
        setTimeout(() => waitForTextarea(attempt + 1, maxAttempts), delay);
      }
    };

    const handleTabChanging = (sender: SurveyCreatorModel, options: any) => {
      if (creator?.activeTab === "json" && options.tabName !== "json") {
        isLeavingJsonTab = true;
      }
    };

    const handleTabChange = (sender: SurveyCreatorModel, options: any) => {
      isLeavingJsonTab = false;

      if (options.tabName === "json") {
        waitForTextarea();
      }
    };

    if (creator) {
      creator.onModified.add(setAsModified);
      creator.onActiveTabChanging.add(handleTabChanging);
      creator.onActiveTabChanged.add(handleTabChange);

      if (creator.activeTab === "json") {
        waitForTextarea();
      }

      return () => {
        creator.onModified.remove(setAsModified);
        creator.onActiveTabChanging.remove(handleTabChanging);
        creator.onActiveTabChanged.remove(handleTabChange);

        const jsonTextarea = document.querySelector(
          ".svc-json-editor-tab__content-area",
        ) as HTMLTextAreaElement;
        if (jsonTextarea && (jsonTextarea as any).__handlerAttached) {
          jsonTextarea.removeEventListener(
            "input",
            (jsonTextarea as any).__inputHandler,
          );
        }
      };
    }
  }, [creator, themeId, onUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || isCurrentThemeModified) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isCurrentThemeModified]);

  useEffect(() => {
    if (!creator || !formJson) {
      return;
    }

    creator.JSON = formJson;
  }, [creator, formJson]);

  return (
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
  );
}
export default FormEditor;
export type { FormEditorProps };
