import { useEffect, useRef, useTransition } from "react";
import { useFormAssistant } from "./form-assistant.context";

interface UseAutoCreateFormProps {
  onFormCreated: (formId: string) => void;
}

export function useAutoCreateForm({ onFormCreated }: UseAutoCreateFormProps) {
  const { chatContext, generateAssociatedForm } = useFormAssistant();
  const previousResultJsonRef = useRef<object | undefined>(undefined);

  const [isPending, startTransition] = useTransition();
  const hasTriggeredRef = useRef(false);
  const formId = chatContext?.formId;
  const currentResultJson = chatContext?.resultDefinition;
  const hasError = !!chatContext?.error;

  useEffect(() => {
    if (formId || isPending || hasTriggeredRef.current) {
      return;
    }

    const previousResultJson = previousResultJsonRef.current;
    if (previousResultJson || !currentResultJson) {
      return;
    }

    if (currentResultJson && !hasError) {
      hasTriggeredRef.current = true;

      startTransition(async () => {
        const newFormId = await generateAssociatedForm();
        if (newFormId) {
          onFormCreated?.(newFormId);
        }
      });
    }

    previousResultJsonRef.current = currentResultJson;
  }, [
    formId,
    isPending,
    currentResultJson,
    hasError,
    generateAssociatedForm,
    onFormCreated,
    chatContext,
  ]);

  useEffect(() => {
    return () => {
      hasTriggeredRef.current = false;
    };
  }, []);

  return {
    isCreatingForm: isPending,
  };
}
