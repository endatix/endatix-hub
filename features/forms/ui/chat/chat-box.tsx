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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ConversationState,
  useFormAssistant,
} from "../../use-cases/design-form";

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

interface ChatBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  currentDefinition?: string;
  placeholder?: string;
  onPendingChange?: (pending: boolean) => void;
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
  currentDefinition,
  onPendingChange,
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
  const { chatContext, sendPrompt } = useFormAssistant();

  const [promptState, promptAction, isGeneratingResponse] = useActionState(
    async (
      _: ConversationState | undefined,
      formData: FormData,
    ): Promise<ConversationState | undefined> => {
      return await handleSendPrompt(formData);
    },
    undefined as unknown as ConversationState,
  );

  useEffect(() => {
    if (onPendingChange) {
      onPendingChange(isGeneratingResponse);
    }
  }, [isGeneratingResponse, onPendingChange]);

  useEffect(() => {
    if (isGeneratingResponse && isTranslationMode) {
      onTranslationModeChange?.(false);
    }
  }, [isGeneratingResponse, isTranslationMode, onTranslationModeChange]);

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

    if (chatContext) {
      formData.set("threadId", chatContext.threadId ?? "");
      formData.set("agentId", chatContext.agentId ?? "");
    }

    startTransition(() => {
      promptAction(formData);
    });
  };

  const handleSendPrompt = async (
    formData: FormData,
  ): Promise<ConversationState | undefined> => {
    const prompt = formData.get("prompt") as string;
    if (!prompt?.trim()) {
      return undefined;
    }

    setRetryMode(false);

    const newChatContext = await sendPrompt(prompt, currentDefinition);
    if (newChatContext.error) {
      setRetryMode(true);
      return newChatContext;
    }

    onFormGenerated?.();
    setInput("");
    return newChatContext;
  };

  return (
    <div className={`flex flex-col flex-1 gap-2 ${className}`} {...props}>
      {chatContext?.error && (
        <ChatErrorAlert errorMessage={chatContext.error} />
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
            disabled={isGeneratingResponse || !targetLanguage.trim()}
            variant="default"
            size="sm"
            onClick={handleTranslateSubmit}
            className="h-8"
          >
            <Globe className="mr-2 h-4 w-4" />
            {isGeneratingResponse ? "Translating..." : "Translate"}
          </Button>
        </div>
      )}

      <form
        action={promptAction}
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
              if (input.trim() && !isGeneratingResponse) {
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
              <TooltipContent side="top" className="z-[9999]">
                File attachments coming soon
              </TooltipContent>
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
              <TooltipContent side="top" className="z-[9999]">
                Voice input coming soon
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SubmitButton
            pending={isGeneratingResponse}
            disabled={input.length === 0}
            retryMode={retryMode}
          />
        </div>
      </form>
      <p className="text-center text-xs text-gray-500">
        Endatix AI Assistant may make mistakes. Please use with discretion.
      </p>
    </div>
  );
};

export default ChatBox;
