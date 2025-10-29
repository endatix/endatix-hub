"use client";

import {
  AlertCircle,
  ArrowUp,
  Mic,
  Paperclip,
  StopCircle,
  Globe,
  Repeat2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useActionState, useEffect, useState, startTransition } from "react";
import { PromptResult } from "@/features/forms/ui/chat/prompt-result";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AssistantStore,
  DefineFormCommand,
} from "@/features/forms/ui/chat/use-cases/assistant";
import { redirect } from "next/navigation";
import { defineFormAction } from "../../application/actions/define-form.action";
import { ApiResult } from "@/lib/endatix-api";

const ChatErrorAlert = ({
  errorMessage,
}: {
  errorMessage: string | undefined;
}) => {
  return (
    <Alert variant="destructive" className="">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  );
};

const SubmitButton = ({
  pending,
  disabled,
  retryMode = false,
}: {
  pending: boolean;
  disabled: boolean;
  retryMode?: boolean;
}) => {

  const chatIcon = retryMode ? (
    <Repeat2 className="size-4" />
  ) : pending ? (
    <StopCircle className="size-4" />
  ) : (
    <ArrowUp className="size-4" />
  );

  const tooltipText = retryMode ? "Retry" : "Send";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="submit"
            size="icon"
            className={cn("ml-auto", pending ? "cursor-progress" : "")}
            aria-disabled={pending}
            disabled={disabled || pending}
          >
            {chatIcon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const initialState = PromptResult.InitialState();

interface ChatBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  formId?: string;
  currentDefinition?: string;
  requiresNewContext?: boolean;
  placeholder?: string;
  onPendingChange?: (pending: boolean) => void;
  onStateChange?: (stateCommand: DefineFormCommand, newDefinition?: object) => void;
  onFormGenerated?: () => void;
  isTranslationMode?: boolean;
  targetLanguage?: string;
  onTargetLanguageChange?: (language: string) => void;
  onTranslationModeChange?: (isTranslationMode: boolean) => void;
  chatInputRef?: React.RefObject<HTMLTextAreaElement | null>;
  languageInputRef?: React.RefObject<HTMLInputElement | null>;
}

const ChatBox = ({
  className,
  placeholder,
  formId,
  currentDefinition,
  requiresNewContext,
  onPendingChange,
  onStateChange,
  onFormGenerated,
  isTranslationMode = false,
  targetLanguage = "",
  onTargetLanguageChange,
  onTranslationModeChange,
  chatInputRef,
  languageInputRef,
  ...props
}: ChatBoxProps) => {
  const [input, setInput] = useState("");
  const [retryMode, setRetryMode] = useState(false);
  const [state, action, pending] = useActionState(
    async (prevState: PromptResult, formData: FormData) => {
      const contextStore = new AssistantStore();
      setRetryMode(false);

      if (requiresNewContext) {
        contextStore.clear(formId);
        contextStore.setChatContext({
          messages: [],
          threadId: "",
          agentId: "",
          isInitialPrompt: true,
        }, formId);
      }

      const formContext = contextStore.getChatContext(formId);
      if (formContext) {
        if (formContext.threadId) {
          formData.set("threadId", formContext.threadId);
        }
        if (formContext.agentId) {
          formData.set("agentId", formContext.agentId);
        }
      }

      // Send current definition to AI for context
      if (currentDefinition) {
        formData.set("definition", currentDefinition);
      }

      // Pass formId to backend for conversation tracking
      if (formId) {
        formData.set("formId", formId);
      }

      const promptResult = await defineFormAction(prevState, formData);

      if (promptResult === undefined){
        setRetryMode(false);
        return PromptResult.Error("Could not proceed with defining form");
      }

      if (ApiResult.isError(promptResult)) {
        setRetryMode(true);
        return promptResult;
      }

      if (promptResult.data?.definition) {
        const prompt = formData.get("prompt") as string;
        contextStore.setFormModel(JSON.stringify(promptResult.data.definition), formId);
        const currentContext = contextStore.getChatContext(formId);
        currentContext.threadId = promptResult.data?.threadId ?? "";
        currentContext.agentId = promptResult.data?.agentId ?? "";

        if (currentContext.messages === undefined) {
          currentContext.messages = [];
        }

        currentContext.messages.push({
          isAi: false,
          content: prompt,
        });

        if (currentContext.messages.length > 1) {
          currentContext.isInitialPrompt = false;
        }

        if (promptResult.data?.agentResponse) {
          currentContext.messages.push({
            isAi: true,
            content: promptResult.data?.agentResponse,
          });
        }

        contextStore.setChatContext(currentContext, formId);

        if (onStateChange) {
          onStateChange(DefineFormCommand.fullStateUpdate, promptResult.data.definition);
        }

        // If onFormGenerated callback is provided (Create Form sheet scenario),
        // call it to navigate to designer. Otherwise, redirect to preview page.
        if (onFormGenerated) {
          onFormGenerated();
        } else if (window.location.pathname === "/forms") {
          redirect("/forms/create");
        }

        setInput("");
      }
      return promptResult;
    },
    initialState,
  );

  useEffect(() => {
    if (onPendingChange) {
      onPendingChange(pending);
    }
  }, [pending, onPendingChange]);

  // Hide translation UI when operation starts or completes
  useEffect(() => {
    if (pending && isTranslationMode) {
      onTranslationModeChange?.(false);
    }
  }, [pending, isTranslationMode, onTranslationModeChange]);

  // Handle translation submission
  const handleTranslateSubmit = () => {
    setRetryMode(false);

    if (!targetLanguage.trim()) {
      return;
    }

    const formData = new FormData();
    formData.set(
      "prompt",
      `Add ${targetLanguage} translations to this form...`,
    );

    const contextStore = new AssistantStore();
    const formContext = contextStore.getChatContext();
    if (formContext) {
      formData.set("threadId", formContext.threadId ?? "");
      formData.set("agentId", formContext.agentId ?? "");
    }

    startTransition(() => {
      action(formData);
    });
  };

  return (
    <div className={`flex flex-col flex-1 gap-2 ${className}`} {...props}>
      {ApiResult.isError(state) && (
        <ChatErrorAlert errorMessage={state.error.message} />
      )}

      {isTranslationMode && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <span className="text-sm font-medium">Add new languages:</span>
          <input
            ref={languageInputRef}
            type="text"
            value={targetLanguage}
            onChange={(e) => onTargetLanguageChange?.(e.target.value)}
            placeholder="e.g., Spanish, French, German..."
            className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button
            disabled={pending || !targetLanguage.trim()}
            variant="default"
            size="sm"
            onClick={handleTranslateSubmit}
            className="h-8"
          >
            <Globe className="mr-2 h-4 w-4" />
            {pending ? "Translating..." : "Translate"}
          </Button>
        </div>
      )}

      <form
        action={action}
        className="flex-1 relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
      >
        <Label htmlFor="prompt" className="sr-only">
          Your prompt here
        </Label>
        <Textarea
          ref={chatInputRef}
          id="prompt"
          name="prompt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !pending) {
                const form = e.currentTarget.form;
                if (form) {
                  form.requestSubmit();
                }
              }
            }
          }}
          placeholder={
            isTranslationMode && targetLanguage
              ? `Add ${targetLanguage} translations to this form...`
              : placeholder ?? "What would you like to achieve with your form?"
          }
          className="min-h-12 resize-none border-0 p-3 shadow-none focus:outline-none focus-visible:ring-0"
        />
        <div className="flex items-center p-3 pt-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    disabled
                    variant="ghost"
                    size="icon"
                    className="disabled:opacity-50 pointer-events-none"
                  >
                    <Paperclip className="size-4" />
                    <span className="sr-only">Attach file</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-[9999]">File attachments coming soon</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button
                    disabled
                    variant="ghost"
                    size="icon"
                    className="disabled:opacity-50 pointer-events-none"
                  >
                    <Mic className="size-4" />
                    <span className="sr-only">Use Microphone</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-[9999]">Voice input coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SubmitButton pending={pending} disabled={input.length === 0} retryMode={retryMode} />
        </div>
      </form>
      <p className="text-center text-xs text-gray-500">
        Endatix AI Assistant may make mistakes. Please use with discretion.
      </p>
    </div>
  );
};

export default ChatBox;
