"use client";

import {
  AlertCircle,
  CornerDownLeft,
  Mic,
  Paperclip,
  StopCircle,
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
}

const ChatBox = ({
  className,
  placeholder,
  requiresNewContext,
  onPendingChange,
  onStateChange,
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

      if (promptResult.success && promptResult.data?.definition) {
        const prompt = formData.get("prompt") as string;
        contextStore.setFormModel(JSON.stringify(promptResult.data.definition));
        const currentContext = contextStore.getChatContext();
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
