"use client";

import { updateFormNameAction } from "@/app/(main)/forms/[formId]/update-form-name.action";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { registerSpecializedQuestion, SpecializedVideo } from "@/lib/questions";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Action,
  slk,
  ITheme,
  getLocaleStrings,
  settings,
  SvgRegistry,
} from "survey-core";
import "survey-core/survey-core.css";
import {
  ICreatorOptions,
  PredefinedThemes,
  SurveyCreatorModel,
  UploadFileEvent,
} from "survey-creator-core";
import "survey-creator-core/survey-creator-core.css";
import SurveyCreatorTheme from "survey-creator-core/themes";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import { updateFormDefinitionJsonAction } from "../update-form-definition-json.action";
// import { rentalThemeDark, rentalThemeLight } from "./rental-theme";

registerSpecializedQuestion(SpecializedVideo);
// registerSurveyTheme(SurveyTheme);
// registerSurveyTheme(rentalThemeLight, rentalThemeDark);

const saveAsIcon =
  '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d = "M24 11H22V13H20V11H18V9H20V7H22V9H24V11ZM20 14H22V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V4L4 2H20C21.1 2 22 2.9 22 4V6H20V4H17V8H7V4H4.83L4 4.83V20H6V13H18V20H20V14ZM9 6H15V4H9V6ZM16 15H8V20H16V15Z" fill="black" fill-opacity="1" /></svg>';
SvgRegistry.registerIcon("icon-saveas", saveAsIcon);

interface FormEditorProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
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

function FormEditor({
  formJson,
  formId,
  formName,
  options,
  slkVal,
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

  const getThemes = async () => {
    try {
      const response = await fetch("/api/hub/v0/themes");

      if (!response.ok) {
        throw new Error("Failed to fetch themes");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error: ", error);
      return [];
    }
  };

  const saveTheme = useCallback(
    (saveNo: number, callback: (num: number, status: boolean) => void) => {
      const creatorTheme = creator?.theme;
      debugger;
      console.log("saveTheme", saveNo, creatorTheme);
      callback(saveNo, true);
    },
    [creator],
  );

  const handleSaveTheme = useCallback(
    (saveNo: number, callback: (num: number, status: boolean) => void) => {
      debugger;
      saveTheme(saveNo, callback);
    },
    [saveTheme],
  );

  const saveCustomTheme = useCallback(() => {
    // Get the current theme
    const currentTheme = creator?.theme;
    debugger;
    if (!currentTheme) {
      return;
    }

    // TODO: Get the ID from the database
    const themeId = Math.random().toString(36).substring(2, 15);
    // Generate a unique theme name
    currentTheme.themeName += "_modified_" + themeId;
    // Generate a human-friendly theme name
    const themeTitle = "My Custom Theme " + themeId;
    console.log("themeTitle", themeTitle);
    // askForThemeName("Do you want to save the current theme configuration?", "Enter a theme title", { title: themeTitle }, (confirm, data) => {
    //     if (confirm) {
    //         addCustomTheme(currentTheme, data.title);
    //         // Set the theme as a current theme; update the theme list and theme options
    //         const themeModel = themeTabPlugin.themeModel;
    //         themeModel.setTheme(currentTheme);
    //         themeId++;
    //         updateCustomActions();
    //         // ...
    //         // (Optional) Save the theme to an external storage here
    //         // ...
    //     }
    // });
  }, [creator]);

  const addCustomTheme = useCallback(
    (theme: ITheme) => {
      const themeTabPlugin = creator!.themeEditor!;
      themeTabPlugin.addTheme(theme);
    },
    [creator],
  );

  const deleteCurrentTheme = useCallback(() => {
    const currentTheme = creator?.theme;
    debugger;
    if (!creator || !currentTheme) {
      return;
    }

    const themeName = currentTheme.themeName;
    if (!themeName) {
      return;
    }

    const builtInThemeIndex = PredefinedThemes.indexOf(themeName);
    if (builtInThemeIndex === -1) {
      // A custom theme
      const enLocale = getLocaleStrings("en");
      settings.confirmActionAsync(
        'Do you want to delete the following theme: "' +
          enLocale.theme.names[themeName] +
          '"?',
        (confirm) => {
          if (confirm) {
            const themeTabPlugin = creator?.themeEditor;
            themeTabPlugin.removeTheme(currentTheme, true);
            const themeModel = themeTabPlugin.themeModel;
            themeModel.setTheme({ themeName: "default" });
            //updateCustomActions();
            // ...
            // (Optional) Delete the theme from an external storage here
            // ...
          }
        },
      );
    }
  }, [creator]);

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
    // newCreator.theme = rentalThemeLight;
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
    if (creator) {
      creator.onModified.add(() => {
        setHasUnsavedChanges(true);
      });

      creator.saveThemeFunc = handleSaveTheme;

      const saveThemeAction = new Action({
        id: "svd-save-custom-theme",
        title: "Add custom theme to the list",
        action: saveCustomTheme,
        iconName: "icon-saveas",
        showTitle: false,
      });
      const deleteThemeAction = new Action({
        id: "svd-delete-custom-theme",
        title: "Delete theme",
        action: deleteCurrentTheme,
        iconName: "icon-delete",
        showTitle: false,
      });

      creator.toolbar.actions.push(saveThemeAction);
      creator.toolbar.actions.push(deleteThemeAction);
      const themeTabPlugin = creator.themeEditor;

      const updateCustomActions = () => {
        const isThemeTab = creator.activeTab === "theme";
        saveThemeAction.visible = isThemeTab;
        // TODO: Implement proper theme name/id lookup
        const currentThemeName = creator.theme?.themeName;
        const isCustomTheme =
          currentThemeName == "Rental Theme" ||
          (currentThemeName !== undefined &&
            PredefinedThemes.indexOf(currentThemeName) === -1);
        deleteThemeAction.visible = isThemeTab && isCustomTheme;
      };

      getThemes()
        .then((themes) => {
          themes.forEach((theme: ITheme) => {
            addCustomTheme(theme, theme.themeName!);
          });
        })
        .catch((error) => {
          console.error("Error: ", error);
        });

      updateCustomActions();
      themeTabPlugin.onThemeSelected.add(updateCustomActions);
      creator.onActiveTabChanged.add(updateCustomActions);
      themeTabPlugin.advancedModeEnabled = true;
    }
  }, [creator, saveCustomTheme, deleteCurrentTheme, handleSaveTheme]);

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
      const result = await updateFormDefinitionJsonAction(
        formId,
        isDraft,
        updatedFormJson,
      );
      if (result.success) {
        setHasUnsavedChanges(false);
        toast.success("Form saved");
      } else {
        throw new Error(result.error);
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
