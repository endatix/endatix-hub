"use client";

import { toast } from "@/components/ui/toast";
import { customQuestions } from "@/customizations/questions/question-registry";
import { useStorageWithCreator } from "@/features/asset-storage/client";
import { useSurveyLicenseKey } from "@/features/config/survey-license-provider";
import {
  DEFAULT_THEME_ID,
  ThemeDeleteDialog,
  ThemeSaveDialog,
  useThemeManagement,
} from "@/features/themes/manage-theme-editor";
import { StoredTheme } from "@/features/themes/types";
import { updateFormThemeAction } from "@/features/themes/update-form-theme";
import { useDesignerRuntime } from "@/lib/designer-runtime";
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
import {
  ConvertInlineChoicesDialog,
  useConvertInlineChoicesUi,
} from "@/lib/survey-features/data-lists";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";
import { useFormDiagnostics } from "@/lib/survey-features/form-diagnostics";
import { JSON_CHANGED_TYPE } from "@/lib/survey-features/json-editor/json-editor-state";
import {
  JsonEditorState,
  useJsonEditor,
} from "@/lib/survey-features/json-editor/use-json-editor.hook";
import { useQuestionLoops } from "@/lib/survey-features/question-loops";
import { useRichTextEditing } from "@/lib/survey-features/rich-text";
import { useLoopAwareSummaryTableEditing } from "@/lib/survey-features/summary-table";
import { useCreatorTabUrl } from "@/lib/survey-features/survey-design/ui";
import { applyEndatixCreatorTheme } from "@/lib/themes/creator-theme";
import { registerThemes } from "@/lib/themes/survey-theme";
import { useEndatixCreatorTheme } from "@/lib/themes/use-endatix-themes";
import { CreateCustomQuestionRequest } from "@/services/api";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/theme-github_light_default";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "survey-core";
import { JsonObject, Serializer, slk, SvgRegistry } from "survey-core";
import "survey-core/i18n";
import "survey-core/survey-core.css";
import {
  getLocaleStrings,
  ICreatorOptions,
  ModifiedEvent,
  SurveyCreatorModel,
  SurveyInstanceCreatedEvent,
} from "survey-creator-core";
import "survey-creator-core/i18n";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import {
  CustomQuestionDialog,
  type CustomQuestionRequest,
} from "./custom-question-dialog";
import { createCustomQuestionAction } from "../../application/actions/create-custom-question.action";
import { updateFormDefinitionJsonAction } from "../../application/actions/update-form-definition-json.action";
import {
  customizeQuestionClassesOnCreator,
  loadBuiltInCustomQuestionClasses,
} from "./survey-creator-custom-questions";

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

const translations = getLocaleStrings("en");

translations.pehelp.fileNamesPrefix =
  "Set a prefix for the downloaded submission files using an expression. <br/>" +
  "You can reference question values with curly braces, e.g. <em>{gender}</em> or <em>{age}</em>. Example: <br/>" +
  "<b>Example:</b> <input disabled name='example-expression' class='spg-comment spg-text p-1' value='{gender} + \"-\" + {age}'></input><br/>" +
  'creates file names like <em>"male-25-q1.pdf"</em> or <em>"female-30-profilePic-2.png"</em><br/>' +
  "This helps organize files by including specific answers provided by the respondent in the file name.<br/><br/>" +
  "<b>Note:</b> The expression is evaluated for each submission prior to donwloading the files provided by the respondent. The unique question's name, for which the file was uploaded is always added to the filename.<br/><br/>" +
  "For more information on how to write expression, see <a target='_blank' class='hover:underline' href='https://surveyjs.io/survey-creator/documentation/end-user-guide/expression-syntax'>Expression Syntax</a>.";

// Drawn as solid-fill paths (SurveyJS's own "icon-pg-*-24x24" property-grid
// tab icons are fill-based outlines, not strokes — a stroked path renders
// visibly bolder next to them at the same nominal width, especially at
// corners). Folder outline uses the hole trick (outer subpath + reversed
// inner subpath), with its 5 convex corners given a 1-unit radius fillet —
// the inner subpath's arcs use the opposite sweep flag from the outer's
// since it's traced in reverse for the fill-rule hole. The step where the
// tab meets the body is a concave corner and stays sharp. The arrow reuses
// the same solid stem+triangle shape as DRAG_CATEGORIZE_SVG.
const downloadSettingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 21A1 1 0 0 1 2 20L2 4A1 1 0 0 1 3 3L8 3A1 1 0 0 1 9 4L9 5L21 5A1 1 0 0 1 22 6L22 20A1 1 0 0 1 21 21ZM3.5 18.5A1 1 0 0 0 4.5 19.5L19.5 19.5A1 1 0 0 0 20.5 18.5L20.5 7.5A1 1 0 0 0 19.5 6.5L7.5 6.5L7.5 5.5A1 1 0 0 0 6.5 4.5L4.5 4.5A1 1 0 0 0 3.5 5.5Z"></path><path d="M13 9V12H15L12 16L9 12H11V9H13Z"></path></svg>`;
SvgRegistry.registerIcon("icon-download-settings", downloadSettingsIcon);
const questionLoopsIcon =
  '<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 32 32"><defs><style>.st0{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round;stroke-width:2px}</style></defs><path class="st0" d="M3.3 18.3V28h25.4V9.7H9.6"/><path class="st0" d="M14.4 15.5 8.6 9.7 14.7 4"/></svg>';
SvgRegistry.registerIcon("icon-question-loops", questionLoopsIcon);

registerThemes();

interface FormEditorProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  themeId?: string;
  isPublic?: boolean;
  formIsEnabled?: boolean;
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
  formName,
  options,
  themeId,
  isPublic,
  formIsEnabled,
  initialPropertyGridVisible = true,
  onThemeModificationChange,
  onSaveHandlerReady,
  onPropertyGridControllerReady,
}: Readonly<FormEditorProps>) {
  const slkVal = useSurveyLicenseKey();
  const designerRuntime = useDesignerRuntime();
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
      getRuntimeState: () => designerRuntime.stateRef.current,
    },
  });

  const [questionClasses, setQuestionClasses] = useState<
    SpecializedSurveyQuestionType[]
  >([]);
  const markFormModified = useCallback(() => {
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);
  useRichTextEditing(creator);
  useLoopAwareSummaryTableEditing(creator);
  const {
    initGlobals: initQuestionLoopsGlobals,
    bindToCreator: bindQuestionLoops,
  } = useQuestionLoops();
  const { initGlobals: initAnyAnsweredGlobals } = useAnyAnswered();

  const {
    initGlobals: initFormDiagnosticsGlobals,
    bindToCreator: bindFormDiagnostics,
  } = useFormDiagnostics(creator);

  const creatorTheme = useEndatixCreatorTheme();
  const creatorThemeRef = useRef(creatorTheme);
  creatorThemeRef.current = creatorTheme;

  const convertInlineChoicesUi = useConvertInlineChoicesUi({
    creator,
    markFormModified,
  });
  useCreatorTabUrl(creator);

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

      if (Result.isError(updateThemeResult)) {
        toast.error(updateThemeResult.message || "Failed to update form theme");
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

  const [customQuestionRequest, setCustomQuestionRequest] =
    useState<CustomQuestionRequest | null>(null);
  const {
    saveThemeHandler,
    isThemeDirty,
    themeSaveRequest,
    themeDeleteRequest,
    closeThemeDeleteRequest,
  } = useThemeManagement({
    formId,
    creator,
    themeId,
    onThemeIdChanged: markFormModified,
  });

  // The theme is persisted first so `saveForm` picks up a newly created theme id.
  // `saveThemeHandler` is a no-op when the theme is clean and resolves once the
  // user has answered the dialog, so the form JSON is always saved exactly once.
  const saveFormHandler = useCallback(async () => {
    if (!hasUnsavedChanges && !isThemeDirty && !isJsonModified) {
      toast.info("Nothing to save");
      return;
    }

    await saveThemeHandler();
    await saveForm();
  }, [
    hasUnsavedChanges,
    isThemeDirty,
    isJsonModified,
    saveThemeHandler,
    saveForm,
  ]);

  useEffect(() => {
    onThemeModificationChange?.(isThemeDirty);
  }, [isThemeDirty, onThemeModificationChange]);

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
    (element: Question) => {
      const isDefaultName = /^(question|panel)\d+$/.test(element.name);
      setCustomQuestionRequest({
        elementName: element.name,
        defaultName: isDefaultName ? "" : element.name,
        defaultTitle: isDefaultName ? "" : nameToTitle(element.name),
        onSubmit: (name, title) => saveCustomQuestion(element, name, title),
      });
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
        initFormDiagnosticsGlobals();
        const newCreator = new SurveyCreator(creatorOptions);
        applyEndatixCreatorTheme(
          newCreator,
          creatorThemeRef.current,
          document.getElementById("creator") ?? undefined,
        );
        const cleanupQuestionLoops = bindQuestionLoops(newCreator);
        const cleanupFormDiagnostics = bindFormDiagnostics(newCreator);

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
          cleanupFormDiagnostics?.();
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
    designerRuntime,
    bindQuestionLoops,
    bindFormDiagnostics,
    initAnyAnsweredGlobals,
    initFormDiagnosticsGlobals,
    initQuestionLoopsGlobals,
  ]);

  useEffect(() => {
    if (!creator) return;

    // Delay re-apply until after theme class/token updates settle in the DOM.
    let frame1 = 0;
    let frame2 = 0;
    frame1 = globalThis.window.requestAnimationFrame(() => {
      frame2 = globalThis.window.requestAnimationFrame(() => {
        applyEndatixCreatorTheme(
          creator,
          creatorTheme,
          document.getElementById("creator") ?? undefined,
        );
      });
    });

    return () => {
      if (frame1) globalThis.window.cancelAnimationFrame(frame1);
      if (frame2) globalThis.window.cancelAnimationFrame(frame2);
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
      if (hasUnsavedChanges || isThemeDirty) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    globalThis.window.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      globalThis.window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, isThemeDirty]);

  useEffect(() => {
    if (!creator || !formJson) {
      return;
    }

    creator.JSON = formJson;
  }, [creator, formJson]);

  const isCreatorLoading = isLoading || !isStorageReady;

  return (
    <div id="creator">
      <ConvertInlineChoicesDialog {...convertInlineChoicesUi.dialog} />
      <ThemeSaveDialog request={themeSaveRequest} />
      <ThemeDeleteDialog
        request={themeDeleteRequest}
        onClose={closeThemeDeleteRequest}
      />
      <CustomQuestionDialog
        request={customQuestionRequest}
        onClose={() => setCustomQuestionRequest(null)}
      />

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
