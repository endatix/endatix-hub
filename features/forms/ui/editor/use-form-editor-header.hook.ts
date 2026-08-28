import { toast } from "@/components/ui/toast";
import { updateFormNameAction } from "@/features/forms/application/actions/update-form-name.action";
import { Result } from "@/lib/result";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  RefObject,
} from "react";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";

interface UseFormEditorHeaderProps {
  formId: string;
  initialFormName: string;
  isCurrentThemeModified: boolean;
  onSave: () => Promise<void>;
  onNavigateBack: () => void;
}

export interface FormEditorHeaderState {
  // UI state
  isEditingName: boolean;
  name: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  isSaving: boolean;
  isJsonModified: boolean;
  hasUnsavedChanges: boolean;
  hasJsonErrors: boolean;
  isOnJsonTab: boolean;
  showSavedSuccess: boolean;

  // Handlers
  handleNameSave: () => void;
  handleSaveAndGoBack: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  saveFormHandler: () => void;
  clearSavedSuccess: () => void;
  setIsEditingName: (editing: boolean) => void;
  setName: (name: string) => void;
}

export const useFormEditorHeader = ({
  formId,
  initialFormName,
  isCurrentThemeModified,
  onSave,
  onNavigateBack,
}: UseFormEditorHeaderProps): FormEditorHeaderState => {
  const { hasUnsavedChanges, hasJsonErrors, isOnJsonTab, isJsonModified } =
    useSurveyDesigner();
  const [isEditingName, setIsEditingName] = useState(
    initialFormName === "New Form",
  );
  const [name, setName] = useState(initialFormName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [originalName, setOriginalName] = useState(initialFormName);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedSuccess, setShowSavedSuccess] = useState(false);

  const handleNameSave = useCallback(async () => {
    if (name !== originalName) {
      startTransition(async () => {
        const updateNameResult = await updateFormNameAction(formId, name);
        if (updateNameResult === undefined) {
          toast.error("Could not proceed with updating form name");
          return;
        }

        if (Result.isError(updateNameResult)) {
          toast.error(
            "Failed to update form name: " + updateNameResult.message,
          );
          return;
        }

        setOriginalName(name);
        setName(name);
        toast.success("Form name updated");
      });
    }
    setIsEditingName(false);
  }, [formId, name, originalName, startTransition]);

  const handleSaveAndGoBack = useCallback(() => {
    const hasChanges =
      hasUnsavedChanges || isCurrentThemeModified || isJsonModified;
    if (!hasChanges) {
      onNavigateBack();
      return;
    }

    const confirm = window.confirm(
      "There are unsaved changes. Are you sure you want to leave?",
    );
    if (confirm) {
      onNavigateBack();
    }
  }, [
    hasUnsavedChanges,
    isCurrentThemeModified,
    onNavigateBack,
    isJsonModified,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleNameSave();
      } else if (e.key === "Escape") {
        setName(originalName);
        setIsEditingName(false);
      }
    },
    [handleNameSave, originalName],
  );

  // Deliberately NOT wrapped in startTransition: the save flow can open a modal that
  // waits on the user, and a transition would both keep `isPending` stuck for as long
  // as the dialog is open and deprioritise the render that paints it.
  const saveFormHandler = useCallback(async () => {
    const hasChanges =
      hasUnsavedChanges || isCurrentThemeModified || isJsonModified;
    if (!hasChanges) {
      toast.info("Nothing to save");
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      setShowSavedSuccess(true);
    } catch (error) {
      console.error("Error in save flow:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, isCurrentThemeModified, isJsonModified, onSave]);

  const clearSavedSuccess = useCallback(() => setShowSavedSuccess(false), []);

  // Handle click outside to save name
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
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingName, handleNameSave]);

  return {
    isEditingName,
    name,
    inputRef,
    isPending,
    isSaving,
    hasUnsavedChanges,
    hasJsonErrors,
    isOnJsonTab,
    showSavedSuccess,
    isJsonModified,
    handleNameSave,
    handleSaveAndGoBack,
    handleKeyDown,
    saveFormHandler,
    clearSavedSuccess,
    setIsEditingName,
    setName,
  };
};
