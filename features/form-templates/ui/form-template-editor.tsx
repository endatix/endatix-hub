"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  useLayoutEffect,
} from "react";
import { slk } from "survey-core";
import "survey-core/survey-core.css";
import {
  ICreatorOptions,
  SurveyCreatorModel,
  TabJsonEditorTextareaPlugin,
  UploadFileEvent,
} from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { updateTemplateJsonAction } from "../application/update-template-json.action";
import { updateTemplateNameAction } from "../application/update-template-name.action";
import { endatixTheme } from "@/components/editors/endatix-theme";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { Result } from "@/lib/result";
import { initializeCustomQuestions } from "@/lib/questions/infrastructure/specialized-survey-question";
import "survey-core/i18n";
import "survey-creator-core/i18n";

const invalidJsonErrorMessage =
  "Invalid JSON! Please fix all errors in the JSON editor before saving.";

export interface FormTemplateEditorProps {
  templateId: string;
  templateJson: object | null;
  templateName: string;
  description?: string;
  isEnabled: boolean;
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

function FormTemplateEditor({
  templateJson,
  templateId,
  templateName,
  options,
  slkVal,
}: FormTemplateEditorProps) {
  const [creator, setCreator] = useState<SurveyCreator | null>(null);
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(templateName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [originalName, setOriginalName] = useState(templateName);
  const [isPending, startTransition] = useTransition();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questionClasses, setQuestionClasses] = useState<any[]>([]);

  const handleNameSave = useCallback(async () => {
    if (name !== originalName) {
      startTransition(async () => {
        const updateTemplateNameResult = await updateTemplateNameAction(
          templateId,
          name,
        );

        if (updateTemplateNameResult === undefined) {
          toast.error("Could not proceed with updating template name");
          return;
        }

        if (Result.isError(updateTemplateNameResult)) {
          toast.error(
            updateTemplateNameResult.message ||
              "Failed to update template name",
          );
          setName(originalName);
          return;
        }

        setOriginalName(name);
        setName(name);
        toast.success("Template name updated");
      });
    }
    setIsEditingName(false);
  }, [templateId, name, originalName, startTransition]);

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
          "edx-form-id": templateId,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          options.callback("success", data.url);
        })
        .catch((error) => {
          console.error("Error", error);
          options.callback("error", undefined);
        });
    },
    [templateId],
  );

  useLayoutEffect(() => {
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

        const newCreator = new SurveyCreator(options || defaultCreatorOptions);
        newCreator.applyCreatorTheme(endatixTheme);
        newCreator.saveSurveyFunc = (
          no: number,
          callback: (num: number, status: boolean) => void,
        ) => {
          console.log(JSON.stringify(newCreator?.JSON));
          callback(no, true);
        };
        newCreator.onUploadFile.add(handleUploadFile);

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
  }, [options, slkVal, handleUploadFile]);

  useEffect(() => {
    if (creator && templateJson) {
      creator.JSON = templateJson;
    }
  }, [creator, templateJson]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
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
    let isLeavingJsonTab = false;

    const setAsModified = () => {
      if (isLeavingJsonTab) {
        return;
      }

      setHasUnsavedChanges(true);
    };

    const attachJsonTextareaListener = (jsonTextarea: HTMLTextAreaElement) => {
      if (!(jsonTextarea as any).__handlerAttached) {
        const handleInput = () => {
          setHasUnsavedChanges(true);
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
  }, [creator]);

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

  const handleSaveAndGoBack = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm(
        "There are unsaved changes. Are you sure you want to leave?",
      );
      if (confirm) {
        router.push("/forms/templates");
      }
    } else {
      router.push("/forms/templates");
    }
  };

  const getJsonForSaving = () => {
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
  };

  const saveTemplate = () => {
    startTransition(async () => {
      const updatedFormJson = getJsonForSaving();
      if (updatedFormJson === null) {
        return;
      }

      const updateTemplateJsonResult = await updateTemplateJsonAction(
        templateId,
        updatedFormJson,
      );

      if (updateTemplateJsonResult === undefined) {
        toast.error("Could not proceed with updating template JSON");
        return;
      }

      if (Result.isError(updateTemplateJsonResult)) {
        toast.error(
          updateTemplateJsonResult.message || "Failed to update template JSON",
        );
        return;
      }

      if (Result.isSuccess(updateTemplateJsonResult)) {
        toast.success("Template saved");
        setHasUnsavedChanges(false);
      }
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

  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  return (
    <>
      <div className="flex justify-between items-center mt-0 pt-4 pb-4 px-6 sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex w-full items-center gap-8">
          <button
            onClick={handleSaveAndGoBack}
            className="mr-0 text-2xl flex items-center"
            disabled={isPending}
            style={{ border: "none", background: "transparent" }}
          >
            ←
          </button>

          {isEditingName ? (
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
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
            onClick={saveTemplate}
            variant="default"
            size="sm"
          >
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div id="surveyCreatorContainer">
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

export default FormTemplateEditor;
