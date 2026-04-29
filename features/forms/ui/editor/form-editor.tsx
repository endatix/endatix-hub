"use client";

import { toast } from "@/components/ui/toast";
import { customQuestions } from "@/customizations/questions/question-registry";
import { useStorageWithCreator } from "@/features/asset-storage/client";
import { useThemeManagement } from "@/features/public-form/application/use-theme-management.hook";
import { registerAudioQuestionUI } from "@/lib/questions/audio-recorder";
import addRandomizeGroupFeature from "@/lib/questions/features/group-randomization";
import {
  initializeCustomQuestions,
  SpecializedSurveyQuestionType,
} from "@/lib/questions/infrastructure/specialized-survey-question";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { Result } from "@/lib/result";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import { useAnyAnswered } from "@/lib/survey-features/any-answered";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";
import { JSON_CHANGED_TYPE } from "@/lib/survey-features/json-editor/json-editor-state";
import {
  JsonEditorState,
  useJsonEditor,
} from "@/lib/survey-features/json-editor/use-json-editor.hook";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useRichTextEditing } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTableEditing } from "@/lib/survey-features/summary-table";
import { resolveCreatorThemeCssVariables } from "@/lib/themes/resolve-creator-theme-css-variables";
import { useEndatixCreatorTheme } from "@/lib/themes/use-endatix-themes";
import { useDataLists, useDataListsLoader } from "@/lib/survey-features/data-lists";
import { CreateCustomQuestionRequest } from "@/services/api";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/theme-github_light_default";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Question } from "survey-core";
import {
  JsonObject,
  Serializer,
  settings,
  slk,
  SurveyModel,
  SvgRegistry,
} from "survey-core";
import "survey-core/i18n";
import "survey-core/survey-core.css";
import { BorderlessLightPanelless, DefaultLight } from "survey-core/themes";
import {
  getLocaleStrings,
  ICreatorOptions,
  ModifiedEvent,
  registerSurveyTheme,
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import "survey-creator-core/i18n";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { createCustomQuestionAction } from "../../application/actions/create-custom-question.action";
import {
  customizeQuestionClassesOnCreator,
  loadBuiltInCustomQuestionClasses,
} from "./survey-creator-custom-questions";
import { updateFormDefinitionJsonAction } from "../../application/actions/update-form-definition-json.action";
import { updateFormThemeAction } from "../../application/actions/update-form-theme.action";
import { StoredTheme } from "../../domain/models/theme";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";

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

const DEFAULT_THEME_NAME = "default";
const DEFAULT_THEME_ID = "0"; // Sentinel value for clearing/resetting theme

const translations = getLocaleStrings("en");

translations.pehelp.fileNamesPrefix =
  "Set a prefix for the downloaded submission files using an expression. <br/>" +
  "You can reference question values with curly braces, e.g. <em>{gender}</em> or <em>{age}</em>. Example: <br/>" +
  "<b>Example:</b> <input disabled name='example-expression' class='spg-comment spg-text p-1' value='{gender} + \"-\" + {age}'></input><br/>" +
  'creates file names like <em>"male-25-q1.pdf"</em> or <em>"female-30-profilePic-2.png"</em><br/>' +
  "This helps organize files by including specific answers provided by the respondent in the file name.<br/><br/>" +
  "<b>Note:</b> The expression is evaluated for each submission prior to donwloading the files provided by the respondent. The unique question's name, for which the file was uploaded is always added to the filename.<br/><br/>" +
  "For more information on how to write expression, see <a target='_blank' class='hover:underline' href='https://surveyjs.io/survey-creator/documentation/end-user-guide/expression-syntax'>Expression Syntax</a>.";

const downloadSettingsIcon = `<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24"><defs><style>.st0{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}</style></defs><path class="st0" d="M20 20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-7.9c-.7 0-1.3-.3-1.7-.9l-.8-1.2c-.4-.6-1-.9-1.7-.9H4c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2zm-8-10v6"/><path class="st0" d="m15 13-3 3-3-3"/></svg>`;
SvgRegistry.registerIcon("icon-download-settings", downloadSettingsIcon);
const questionLoopsIcon =
  '<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 32"><defs><style>.st0{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px}</style></defs><path class="st0" d="M3.3 18.3V28h25.4V9.7H9.6"/><path class="st0" d="M14.4 15.5 8.6 9.7 14.7 4"/></svg>';
SvgRegistry.registerIcon("icon-question-loops", questionLoopsIcon);

registerSurveyTheme(DefaultLight);

interface FormEditorProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
  initialPropertyGridVisible?: boolean;
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
  onThemeModificationChange,
  onSaveHandlerReady,
  onPropertyGridControllerReady,
}: Readonly<FormEditorProps>) {
  const formRuntime = useFormRuntime();
  const isCreatorInitializedRef = useRef(false);
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    hasUnsavedChanges,
    isJsonModified,
    setHasUnsavedChanges,
    setHasJsonErrors,
    setIsOnJsonTab,
    setIsJsonModified,
  } = useSurveyDesigner();

  const { registerStorageHandlers, isStorageReady } = useStorageWithCreator({
    itemId: formId,
    itemType: "form",
  });
  const onJsonStateChange = useCallback(
    (state: JsonEditorState) => {
      setHasJsonErrors(state.hasErrors);
      setIsOnJsonTab(state.isOnJsonTab);
      setIsJsonModified(state.isJsonModified);
      if (state.isJsonModified) {
        setHasUnsavedChanges(true);
      }
    },
    [setHasJsonErrors, setIsOnJsonTab, setIsJsonModified, setHasUnsavedChanges],
  );
  const { registerJsonEditor, getJsonModel } = useJsonEditor({
    onJsonStateChange,
  });
  const { isReady: isExtensionsReady, onCreatorCreated } = useSurveyExtensions({
    runtimeDeps: {
      getRuntimeState: () => formRuntime.stateRef.current,
    },
  });

  const [questionClasses, setQuestionClasses] = useState<
    SpecializedSurveyQuestionType[]
  >([]);
  const handleThemeIdChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);
  useRichTextEditing(creator);
  useLoopAwareSummaryTableEditing(creator);
  const {
    initGlobals: initQuestionLoopsGlobals,
    bindToCreator: bindQuestionLoops,
  } = useQuestionLoops();
  const { initGlobals: initDataListsGlobals, setAvailableDataLists } = useDataLists();
  const { dataLists, isLoading: isDataListsLoading } = useDataListsLoader();
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();

  const creatorTheme = useEndatixCreatorTheme();
  const creatorThemeRef = useRef(creatorTheme);
  creatorThemeRef.current = creatorTheme;

  useEffect(() => {
    setAvailableDataLists(dataLists);
  }, [dataLists, setAvailableDataLists]);



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

  const saveForm = useCallback(async () => {
    const isDraft = false;

    const jsonResult = getJsonModel(creator);
    if (Result.isError(jsonResult)) {
      toast.error(jsonResult.message);
      return;
    }

    const updatedFormJson = jsonResult.value;
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

    const newThemeId =
      theme?.themeName?.toLowerCase() === DEFAULT_THEME_NAME
        ? DEFAULT_THEME_ID
        : (theme?.id ?? themeId);
    const currentThemeId = themeId ?? DEFAULT_THEME_ID;

    if (newThemeId !== currentThemeId) {
      const updateThemeResult = await updateFormThemeAction({
        formId,
        themeId: newThemeId,
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

    setHasUnsavedChanges(false);
    setIsJsonModified(false);
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
  }, [
    getJsonModel,
    creator,
    formId,
    themeId,
    setHasUnsavedChanges,
    setIsJsonModified,
  ]);

  const { saveThemeHandler, isCurrentThemeModified } = useThemeManagement({
    formId,
    creator,
    themeId,
    onThemeIdChanged: handleThemeIdChanged,
    onPostThemeSave: saveForm,
  });

  const saveFormHandler = useCallback(async () => {
    if (!hasUnsavedChanges && !isCurrentThemeModified && !isJsonModified) {
      toast.info("Nothing to save");
      return;
    }

    const isThemeSavedFlow = await saveThemeHandler();

    if (!isThemeSavedFlow) {
      await saveForm();
    }
  }, [
    hasUnsavedChanges,
    isCurrentThemeModified,
    isJsonModified,
    saveThemeHandler,
    saveForm,
  ]);

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
    customizeQuestionClassesOnCreator(creator, questionClasses);
  }, [creator, questionClasses]);

  useEffect(() => {
    const initializeNewCreator = async () => {
      if (creator || isCreatorInitializedRef.current) {
        return;
      }

      if (!isExtensionsReady) {
        return;
      }

      if (slkVal) {
        slk(slkVal);
      }

      const newQuestionClasses = await loadBuiltInCustomQuestionClasses();
      if (newQuestionClasses === null) {
        return;
      }

      try {
        // Load dynamic questions using greedy loading strategy (load all custom questions for now)
        for (const questionName of customQuestions) {
          try {
            await questionLoaderModule.loadQuestion(questionName);
            console.debug(`✅ Loaded custom question: ${questionName}`);
          } catch {
            console.warn(`⚠️ Failed to load custom question: ${questionName}`);
          }
        }

        const creatorOptions = {
          ...(options || defaultCreatorOptions),
          showSidebar: initialPropertyGridVisible,
        };
        initAnyAnsweredGlobals();
        initQuestionLoopsGlobals();
        initDataListsGlobals();
        const newCreator = new SurveyCreator(creatorOptions);
        const resolvedTheme = resolveCreatorThemeCssVariables(
          creatorThemeRef.current,
          document.getElementById("creator") ?? undefined,
        );
        newCreator.applyCreatorTheme(resolvedTheme);
        const cleanupQuestionLoops = bindQuestionLoops(newCreator);

        setCreator(newCreator);

        onCreatorCreated(newCreator);

        const unregisterStorage = registerStorageHandlers(newCreator);
        const unregisterJsonEditor = registerJsonEditor(newCreator);

        newCreator.onSurveyInstanceCreated.add(
          (_, options: SurveyInstanceCreatedEvent) => {
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
            const questionLoopsCategory =
              options.survey.getPageByName("questionLoops");
            if (questionLoopsCategory) {
              (
                questionLoopsCategory as unknown as { iconName: string }
              ).iconName = "icon-question-loops";
              questionLoopsCategory.title = "Question Loops";
            }
          },
        );

        if (newQuestionClasses.length > 0) {
          setQuestionClasses(newQuestionClasses);
        }

        isCreatorInitializedRef.current = true;

        return () => {
          cleanupQuestionLoops?.();
          unregisterJsonEditor();
          unregisterStorage();
        };
      } catch (error) {
        console.error("Error loading custom questions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNewCreator();
  }, [
    formId,
    options,
    slkVal,
    creator,
    initialPropertyGridVisible,
    formJson,
    registerStorageHandlers,
    registerJsonEditor,
    isExtensionsReady,
    onCreatorCreated,
    formRuntime,
    bindQuestionLoops,
    initAnyAnsweredGlobals,
    initDataListsGlobals,
    initQuestionLoopsGlobals,
  ]);

  useEffect(() => {
    if (!creator) return;

    // Delay re-apply until after theme class/token updates settle in the DOM.
    let frame1 = 0;
    let frame2 = 0;
    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        const resolvedTheme = resolveCreatorThemeCssVariables(
          creatorTheme,
          document.getElementById("creator") ?? undefined,
        );
        creator.applyCreatorTheme(resolvedTheme);
      });
    });

    return () => {
      if (frame1) window.cancelAnimationFrame(frame1);
      if (frame2) window.cancelAnimationFrame(frame2);
    };
  }, [creator, creatorTheme]);

  useEffect(() => {
    if (!creator) return;

    const setAsModified = (_: SurveyCreatorModel, options: ModifiedEvent) => {
      if (options.type === JSON_CHANGED_TYPE) return;
      
      setHasUnsavedChanges(true);
    };
    creator.onModified.add(setAsModified);

    return () => creator.onModified.remove(setAsModified);
  }, [creator, setHasUnsavedChanges]);

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

  const isCreatorLoading = isLoading || !isStorageReady || isDataListsLoading;

  return (
    <div id="creator">
      {isCreatorLoading ? (
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
