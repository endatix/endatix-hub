import { toast } from "@/components/ui/toast";
import { updateFormNameAction } from "@/features/forms/application/actions/update-form-name.action";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, RefObject } from "react";

interface UseFormEditorHeaderProps {
  formId: string;
  initialFormName: string;
  hasUnsavedChanges: boolean;
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

  // Handlers
  handleNameSave: () => void;
  handleSaveAndGoBack: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  saveFormHandler: () => void;
  setIsEditingName: (editing: boolean) => void;
  setName: (name: string) => void;
}

export const useFormEditorHeader = ({
  formId,
  initialFormName,
  hasUnsavedChanges,
  isCurrentThemeModified,
  onSave,
  onNavigateBack,
}: UseFormEditorHeaderProps): FormEditorHeaderState => {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(initialFormName === "New Form");
  const [name, setName] = useState(initialFormName);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [originalName, setOriginalName] = useState(initialFormName);
  const [isPending, startTransition] = useTransition();
  const [isSaving] = useState(false);

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

  const handleSaveAndGoBack = useCallback(() => {
    if (hasUnsavedChanges || isCurrentThemeModified) {
      const confirm = window.confirm(
        "There are unsaved changes. Are you sure you want to leave?",
      );
      if (confirm) {
        onNavigateBack();
      }
    } else {
      onNavigateBack();
    }
  }, [hasUnsavedChanges, isCurrentThemeModified, onNavigateBack]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setName(originalName);
      setIsEditingName(false);
    }
  }, [handleNameSave, originalName]);

  const saveFormHandler = useCallback(() => {
    startTransition(async () => {
      try {
        await onSave();
      } catch (error) {
        console.error("Error in save flow:", error);
        toast.error("Failed to save changes");
      }
    });
  }, [onSave, startTransition]);

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
    handleNameSave,
    handleSaveAndGoBack,
    handleKeyDown,
    saveFormHandler,
    setIsEditingName,
    setName,
  };
};