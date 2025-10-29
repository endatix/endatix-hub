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
import { redirect } from "next/navigation";
import {
  AssistantStore,
  DefineFormCommand,
} from "@/features/forms/ui/chat/use-cases/assistant";
import { defineFormAction } from "@/features/forms/application/actions/define-form.action";
import { PromptResult } from "@/features/forms/ui/chat/prompt-result";

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

const initialState = PromptResult.InitialState();

interface ChatBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  formId?: string;
  requiresNewContext?: boolean;
  placeholder?: string;
  onPendingChange?: (pending: boolean) => void;
  onStateChange?: (stateCommand: DefineFormCommand) => void;
  onFormGenerated?: () => void;
}

const ChatBox = ({
  className,
  placeholder,
  formId,
  requiresNewContext,
  onPendingChange,
  onStateChange,
  onFormGenerated,
  ...props
}: ChatBoxProps) => {
  const [input, setInput] = useState("");
  const [state, action, pending] = useActionState(
    async (prevState: PromptResult, formData: FormData) => {
      const contextStore = new AssistantStore();

      if (requiresNewContext) {
        contextStore.clear(formId);
        contextStore.setChatContext(
          {
            messages: [],
            threadId: "",
            agentId: "",
            isInitialPrompt: true,
          },
          formId,
        );
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

      // Pass formId to backend for conversation tracking
      if (formId) {
        formData.set("formId", formId);
      }

      const promptResult = await defineFormAction(prevState, formData);

      if (promptResult === undefined) {
        return PromptResult.Error("Could not proceed with defining form");
      }

      if (promptResult.success && promptResult.data?.definition) {
        const prompt = formData.get("prompt") as string;
        contextStore.setFormModel(
          JSON.stringify(promptResult.data.definition),
          formId,
        );
        const currentContext = contextStore.getChatContext(formId);
        currentContext.threadId = promptResult.data.threadId ?? "";
        currentContext.agentId = promptResult.data.agentId ?? "";

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

        if (promptResult.data.agentResponse) {
          currentContext.messages.push({
            isAi: true,
            content: promptResult.data.agentResponse,
          });
        }

        contextStore.setChatContext(currentContext, formId);

        if (onStateChange) {
          onStateChange(DefineFormCommand.fullStateUpdate);
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

  return (
    <div className={`flex flex-col flex-1 gap-2 ${className}`} {...props}>
      {!PromptResult.isError(state) ? null : (
        <ChatErrorAlert errorMessage={PromptResult.getErrorMessage(state)} />
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
          <SubmitButton pending={pending} disabled={input.length === 0} />
        </div>
      </form>
      <p className="text-center text-xs text-gray-500">
        Endatix AI Assistant may make mistakes. Please use with discretion.
      </p>
    </div>
  );
};

export default ChatBox;
