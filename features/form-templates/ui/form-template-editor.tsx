"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useStorageWithCreator } from "@/features/asset-storage/client";
import { useDesignerRuntime } from "@/lib/designer-runtime";
import {
  customizeQuestionClassesOnCreator,
  loadBuiltInCustomQuestionClasses,
} from "@/features/forms/ui/editor/survey-creator-custom-questions";
import { Result } from "@/lib/result";
import {
  ALL_EXTENSIONS,
  DATA_LISTS_RUNTIME_EXTENSION_ID,
  useSurveyExtensions,
} from "@/lib/survey-extensions";
import {
  DesignSurveyProvider,
  useSurveyDesigner,
} from "@/lib/survey-features/designer/design-survey.context";
import { JSON_CHANGED_TYPE } from "@/lib/survey-features/json-editor/json-editor-state";
import { useJsonEditor } from "@/lib/survey-features/json-editor/use-json-editor.hook";
import { useRichTextEditing } from "@/lib/survey-features/rich-text";
import {
  SurveyDesignSaveButton,
  SurveyDesignStatusBadge,
} from "@/lib/survey-features/survey-design/ui";
import { resolveCreatorThemeCssVariables } from "@/lib/themes/resolve-creator-theme-css-variables";
import { useEndatixCreatorTheme } from "@/lib/themes/use-endatix-themes";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/theme-github_light_default";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { slk } from "survey-core";
import "survey-core/i18n";
import "survey-core/survey-core.css";
import {
  ICreatorOptions,
  ModifiedEvent,
  SurveyCreatorModel,
} from "survey-creator-core";
import "survey-creator-core/i18n";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { updateTemplateJsonAction } from "../application/update-template-json.action";
import { updateTemplateNameAction } from "../application/update-template-name.action";

export interface FormTemplateEditorProps {
  templateId: string;
  templateJson: object | null;
  templateName: string;
  description?: string;
  options?: ICreatorOptions;
  slkVal?: string;
}

const defaultCreatorOptions: ICreatorOptions = {
  showPreview: true,
  showJSONEditorTab: true,
  showTranslationTab: true,
  showDesignerTab: true,
  showLogicTab: true,
  themeForPreview: "Default",
};

// Template editor intentionally excludes runtime-only extensions (e.g. data-lists)
// because templates are not bound to a form access JWT yet. Re-enable once
// template-scoped access tokens are supported.
const TEMPLATE_EXCLUDED_EXTENSION_IDS: ReadonlySet<string> = new Set([
  DATA_LISTS_RUNTIME_EXTENSION_ID,
]);
const TEMPLATE_EXTENSION_IDS = ALL_EXTENSIONS.filter(
  (extension) => !TEMPLATE_EXCLUDED_EXTENSION_IDS.has(extension.id),
).map((extension) => extension.id);

function FormTemplateEditorContent({
  templateJson,
  templateId,
  templateName,
  options,
  slkVal,
}: Readonly<FormTemplateEditorProps>) {
  const isCreatorInitializedRef = useRef(false);
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const {
    hasUnsavedChanges,
    isJsonModified,
    hasJsonErrors,
    isOnJsonTab,
    setHasUnsavedChanges,
    setHasJsonErrors,
    setIsOnJsonTab,
    setIsJsonModified,
  } = useSurveyDesigner();
  const designerRuntime = useDesignerRuntime();
  const { isReady: isExtensionsReady, onCreatorCreated } = useSurveyExtensions({
    extensionIdsToLoad: TEMPLATE_EXTENSION_IDS,
    runtimeDeps: {
      getRuntimeState: () => designerRuntime.stateRef.current,
    },
  });
  const { registerStorageHandlers, isStorageReady } = useStorageWithCreator({
    itemId: templateId,
    itemType: "template",
  });
  const { registerJsonEditor, getJsonModel } = useJsonEditor({
    onJsonStateChange: (state) => {
      setHasJsonErrors(state.hasErrors);
      setIsOnJsonTab(state.isOnJsonTab);
      setIsJsonModified(state.isJsonModified);
      if (state.isJsonModified) {
        setHasUnsavedChanges(true);
      }
    },
  });
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(templateName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [originalName, setOriginalName] = useState(templateName);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questionClasses, setQuestionClasses] = useState<any[]>([]);
  useRichTextEditing(creator);

  const creatorTheme = useEndatixCreatorTheme();
  const creatorThemeRef = useRef(creatorTheme);
  creatorThemeRef.current = creatorTheme;

  useEffect(() => {
    if (creator === null) return;

    const setAsModified = (_: SurveyCreatorModel, options: ModifiedEvent) => {
      if (options.type === JSON_CHANGED_TYPE) return;

      setHasUnsavedChanges(true);
    };

    creator.onModified.add(setAsModified);

    return () => creator.onModified.remove(setAsModified);
  }, [creator, setHasUnsavedChanges]);

  const handleNameSave = useCallback(async () => {
    if (name === originalName) return;

    setIsSaving(true);

    try {
      const updateTemplateNameResult = await updateTemplateNameAction(
        templateId,
        name,
      );

      if (!updateTemplateNameResult) {
        toast.error("Could not proceed with updating template name");
        return;
      }

      if (Result.isError(updateTemplateNameResult)) {
        toast.error(
          updateTemplateNameResult.message || "Failed to update template name",
        );
        setName(originalName);
        return;
      }

      setOriginalName(name);
      setName(name);
      toast.success("Template name updated");
      setIsEditingName(false);
    } finally {
      setIsSaving(false);
    }
  }, [templateId, name, originalName]);

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
        const newCreator = new SurveyCreator(options || defaultCreatorOptions);

        const resolvedTheme = resolveCreatorThemeCssVariables(
          creatorThemeRef.current,
          document.getElementById("surveyCreatorContainer") ?? undefined,
        );
        newCreator.applyCreatorTheme(resolvedTheme);
        setCreator(newCreator);
        onCreatorCreated(newCreator);

        const unregisterStorage = registerStorageHandlers(newCreator);
        const unregisterJsonEditor = registerJsonEditor(newCreator);

        if (newQuestionClasses.length > 0) {
          setQuestionClasses(newQuestionClasses);
        }

        isCreatorInitializedRef.current = true;

        return () => {
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
    options,
    slkVal,
    registerStorageHandlers,
    registerJsonEditor,
    creator,
    onCreatorCreated,
    isExtensionsReady,
  ]);

  useEffect(() => {
    if (!creator || !templateJson) {
      return;
    }

    creator.JSON = templateJson;
  }, [creator, templateJson]);

  useEffect(() => {
    if (!creator) {
      return;
    }

    // Delay re-apply until after theme class/token updates settle in the DOM.
    let frame1 = 0;
    let frame2 = 0;
    frame1 = globalThis.requestAnimationFrame(() => {
      frame2 = globalThis.requestAnimationFrame(() => {
        const resolvedTheme = resolveCreatorThemeCssVariables(
          creatorTheme,
          document.getElementById("surveyCreatorContainer") ?? undefined,
        );
        creator.applyCreatorTheme(resolvedTheme);
      });
    });

    return () => {
      if (frame1) globalThis.cancelAnimationFrame(frame1);
      if (frame2) globalThis.cancelAnimationFrame(frame2);
    };
  }, [creator, creatorTheme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (
        inputRef.current &&
        target instanceof Node &&
        !inputRef.current.contains(target)
      ) {
        console.log("Clicked outside, waiting to save name...");
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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingName, handleNameSave]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ""; // Required for Chrome
      }
    };

    globalThis.addEventListener("beforeunload", handleBeforeUnload);
    return () =>
      globalThis.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSaveAndGoBack = () => {
    if (hasUnsavedChanges || isJsonModified) {
      const confirm = globalThis.confirm(
        "There are unsaved changes. Are you sure you want to leave?",
      );
      if (confirm) {
        router.push("/forms/templates");
      }
    } else {
      router.push("/forms/templates");
    }
  };

  const saveTemplate = async () => {
    if (!hasUnsavedChanges && !isJsonModified) {
      toast.info("No changes to save");
      return;
    }

    const jsonResult = getJsonModel(creator);
    if (Result.isError(jsonResult)) {
      toast.error(jsonResult.message);
      return;
    }

    const creatorJson = jsonResult.value;

    setIsSaving(true);
    try {
      const result = await updateTemplateJsonAction(templateId, creatorJson);

      if (!result) {
        toast.error("Could not proceed with updating template JSON");
        return;
      }

      if (Result.isError(result)) {
        toast.error(result.message || "Failed to update template JSON");
        return;
      }

      setHasUnsavedChanges(false);
      setIsJsonModified(false);
      setShowSavedSuccess(true);

      toast.success("Template saved");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setName(originalName);
      setIsEditingName(false);
    }
  };

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  const saveDisabled = isSaving || hasJsonErrors;
  const showInvalidJson = isOnJsonTab && hasJsonErrors;
  const showUnsavedChanges = !hasJsonErrors && hasUnsavedChanges;
  const isCreatorLoading = isLoading || !isStorageReady || !isExtensionsReady;
  return (
    <>
      <div className="sticky top-0 z-50 mt-0 flex w-full items-center justify-between border-border/40 bg-background/95 px-6 pt-4 pb-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex w-full items-center gap-8">
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Save and Go Back"
            onClick={handleSaveAndGoBack}
            disabled={isSaving}
          >
            <ArrowLeftIcon />
          </Button>

          {isEditingName ? (
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded border border-border text-lg font-bold"
              autoFocus
            />
          ) : (
            <span
              className="px-1 text-lg font-bold hover:rounded hover:border hover:border-border"
              onClick={() => setIsEditingName(true)}
              style={{ cursor: "text" }}
            >
              {name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SurveyDesignStatusBadge
            isOnJsonTab={isOnJsonTab}
            isJsonModified={isJsonModified}
            hasJsonErrors={showInvalidJson}
            hasUnsavedChanges={showUnsavedChanges}
            isSaving={isSaving}
            showSavedSuccess={showSavedSuccess}
            onSavedSuccessDismiss={() => setShowSavedSuccess(false)}
          />
          <SurveyDesignSaveButton
            disabled={saveDisabled}
            onClick={saveTemplate}
            label="Save Template"
            savingLabel="Saving..."
            isPending={isSaving}
          />
        </div>
      </div>

      <div id="surveyCreatorContainer">
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
    </>
  );
}

export default function FormTemplateEditor(
  props: Readonly<FormTemplateEditorProps>,
) {
  return (
    <DesignSurveyProvider>
      <FormTemplateEditorContent {...props} />
    </DesignSurveyProvider>
  );
}
