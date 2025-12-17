"use client";

import { AlertCircle, ArrowUp, Mic, Paperclip, StopCircle } from "lucide-react";
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
import { useActionState, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConversationState, useFormAssistant } from "../use-cases/design-form";

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
            {pending ? (
              <StopCircle className="size-4" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Send</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface ChatBoxProxyProps extends React.HTMLAttributes<HTMLDivElement> {
  placeholder?: string;
  onPendingChange?: (pending: boolean) => void;
  onFormGenerated?: () => void;
}

const ChatBoxProxy = ({
  className,
  placeholder,
  onPendingChange,
  onFormGenerated,
  ...props
}: ChatBoxProxyProps) => {
  const [input, setInput] = useState("");
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

  const handleSendPrompt = async (
    formData: FormData,
  ): Promise<ConversationState | undefined> => {
    const prompt = formData.get("prompt") as string;
    if (!prompt?.trim()) {
      return undefined;
    }

    try {
      const newChatContext = await sendPrompt(prompt);

      if (newChatContext.error) {
        return newChatContext;
      }

      if (newChatContext.resultJson && onFormGenerated) {
        onFormGenerated();
      }

      setInput("");
      return newChatContext;
    } catch (error) {
      return {
        ...chatContext!,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      };
    }
  };

  return (
    <div className={`flex flex-col flex-1 gap-2 ${className}`} {...props}>
      {chatContext?.error && (
        <ChatErrorAlert errorMessage={chatContext.error} />
      )}
      <form
        action={promptAction}
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
              if (input.trim() && !isGeneratingResponse) {
                const form = e.currentTarget.form;
                if (form) {
                  form.requestSubmit();
                }
              }
            }
          }}
          placeholder={
            placeholder ?? "What would you like to achieve with your form?"
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
              <TooltipContent side="top">
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
              <TooltipContent side="top">
                Voice input coming soon
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SubmitButton
            pending={isGeneratingResponse}
            disabled={input.length === 0}
          />
        </div>
      </form>
      <p className="text-center text-xs text-gray-500">
        Endatix AI Assistant may make mistakes. Please use with discretion.
      </p>
    </div>
  );
};

export default ChatBoxProxy;
