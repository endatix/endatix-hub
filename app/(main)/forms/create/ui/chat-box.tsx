"use client";

import {
  AlertCircle,
  CornerDownLeft,
  Mic,
  Paperclip,
  StopCircle,
  Globe,
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
import { PromptResult } from "@/app/(main)/forms/create/prompt-result";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AssistantStore,
  DefineFormCommand,
} from "@/app/(main)/forms/create/use-cases/assistant";
import { redirect } from "next/navigation";
import { defineFormAction } from "../define-form.action";
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
}: {
  pending: boolean;
  disabled: boolean;
}) => {
  return (
    <Button
      type="submit"
      size="sm"
      className={cn("ml-auto gap-1.5 w-24", pending ? "cursor-progress" : "")}
      aria-disabled={pending}
      disabled={disabled || pending}
    >
      Chat
      {pending ? (
        <StopCircle className="size-6" />
      ) : (
        <CornerDownLeft className="size-3" />
      )}
    </Button>
  );
};

const initialState = PromptResult.InitialState();

interface ChatBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  requiresNewContext?: boolean;
  placeholder?: string;
  onPendingChange?: (pending: boolean) => void;
  onStateChange?: (stateCommand: DefineFormCommand) => void;
  isTranslationMode?: boolean;
  targetLanguage?: string;
  onTargetLanguageChange?: (language: string) => void;
  onTranslationModeChange?: (isTranslationMode: boolean) => void;
}

const ChatBox = ({
  className,
  placeholder,
  requiresNewContext,
  onPendingChange,
  onStateChange,
  isTranslationMode = false,
  targetLanguage = "",
  onTargetLanguageChange,
  onTranslationModeChange,
  ...props
}: ChatBoxProps) => {
  const [input, setInput] = useState("");
  const [state, action, pending] = useActionState(
    async (prevState: PromptResult, formData: FormData) => {
      const contextStore = new AssistantStore();

      if (requiresNewContext) {
        contextStore.clear();
        contextStore.setChatContext({
          messages: [],
          threadId: "",
          agentId: "",
          isInitialPrompt: true,
        });
      }

      const formContext = contextStore.getChatContext();
      if (formContext) {
        formData.set("threadId", formContext.threadId ?? "");
        formData.set("agentId", formContext.agentId ?? "");
      }

      const promptResult = await defineFormAction(prevState, formData);

      if (ApiResult.isError(promptResult)) {
        return promptResult;
      }

      if (promptResult.data?.definition) {
        const prompt = formData.get("prompt") as string;
        contextStore.setFormModel(promptResult.data?.definition);
        const currentContext = contextStore.getChatContext();
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

        contextStore.setChatContext(currentContext);

        if (onStateChange) {
          onStateChange(DefineFormCommand.fullStateUpdate);
        }

        if (window.location.pathname === "/forms") {
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
                <Button
                  disabled
                  variant="ghost"
                  size="icon"
                  className="disabled:opacity-50"
                >
                  <Paperclip className="size-4" />
                  <span className="sr-only">Attach file</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Attach File</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled
                  variant="ghost"
                  size="icon"
                  className="disabled:opacity-50"
                >
                  <Mic className="size-4" />
                  <span className="sr-only">Use Microphone</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Use Microphone</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SubmitButton pending={pending} disabled={input.length === 0} />
        </div>
      </form>
      <p className="text-center text-xs text-gray-500">
        Endatix may make mistakes. Please use with discretion.
      </p>
    </div>
  );
};

export default ChatBox;
