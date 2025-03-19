"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { registerSpecializedQuestion, SpecializedVideo } from "@/lib/questions";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { slk } from "survey-core";
import "survey-core/survey-core.css";
import SurveyCreatorTheme from "survey-creator-core/themes";
import {
  ICreatorOptions,
  SurveyCreatorModel,
  UploadFileEvent,
} from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { updateTemplateJsonAction } from "../application/update-template-json.action";
import { updateTemplateNameAction } from "../application/update-template-name.action";

registerSpecializedQuestion(SpecializedVideo);

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

  const handleNameSave = useCallback(async () => {
    if (name !== originalName) {
      startTransition(async () => {
        const result = await updateTemplateNameAction(templateId, name);

        if (result.success) {
          setOriginalName(name);
          setName(name);
          toast.success("Template name updated");
        } else {
          toast.error(result.error || "Failed to update template name");
          setName(originalName);
        }
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

  useEffect(() => {
    if (creator) {
      creator.JSON = templateJson;
      return;
    }

    if (slkVal) {
      slk(slkVal);
    }

    const newCreator = new SurveyCreator(options || defaultCreatorOptions);
    SpecializedVideo.customizeEditor(newCreator);

    newCreator.applyCreatorTheme(SurveyCreatorTheme.DefaultContrast);
    newCreator.JSON = templateJson;
    newCreator.saveSurveyFunc = (
      no: number,
      callback: (num: number, status: boolean) => void,
    ) => {
      console.log(JSON.stringify(newCreator?.JSON));
      callback(no, true);
    };
    newCreator.onUploadFile.add(handleUploadFile);

    setCreator(newCreator);
  }, [templateJson, options, creator, slkVal, handleUploadFile]);

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
    if (creator) {
      creator.onModified.add(() => {
        setHasUnsavedChanges(true);
      });
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

  const saveTemplate = () => {
    startTransition(async () => {
      const result = await updateTemplateJsonAction(templateId, creator?.JSON);

      if (result.success) {
        setHasUnsavedChanges(false);
        toast.success("Template saved");
      } else {
        toast.error(result.error || "Failed to save template");
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
      <div className="flex justify-between items-center mt-0 pt-4 pb-4 sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        {creator && <SurveyCreatorComponent creator={creator} />}
      </div>
    </>
  );
}

export default FormTemplateEditor;
