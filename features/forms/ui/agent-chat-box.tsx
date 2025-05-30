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
import { useState, useRef, useEffect } from "react";
import { sendAgentMessageAction } from "@/features/agent/application/actions/send-message.action";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
      Send
      {pending ? (
        <StopCircle className="size-6" />
      ) : (
        <CornerDownLeft className="size-3" />
      )}
    </Button>
  );
};

// const initialState = PromptResult.InitialState();

interface AgentChatBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  placeholder?: string;
  onPendingChange?: (pending: boolean) => void;
}

export function AgentChatBox({ className, placeholder, onPendingChange, ...props }: AgentChatBoxProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsPending(true);
    onPendingChange?.(true);

    try {
      console.log('Sending message to agent:', {
        content: userMessage,
        sessionId: sessionId
      });

      const response = await sendAgentMessageAction({
        content: userMessage,
        sessionId: sessionId
      });

      console.log('Response data:', response);
      
      if (!sessionId) {
        setSessionId(response.sessionId);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }]);
    } finally {
      setIsPending(false);
      onPendingChange?.(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`} {...props}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "flex w-full",
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap",
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-auto">
        <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
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
                if (input.trim() && !isPending) {
                  const form = e.currentTarget.form;
                  if (form) {
                    form.requestSubmit();
                  }
                }
              }
            }}
            placeholder={placeholder ?? "How can I help you today?"}
            className="min-h-12 resize-none border-0 p-3 shadow-none focus:outline-none focus-visible:ring-0"
          />
          <div className="flex items-center p-3 pt-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
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
                    type="button"
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
            <SubmitButton pending={isPending} disabled={input.length === 0} />
          </div>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Endatix may make mistakes. Please use with discretion.
        </p>
      </div>
    </div>
  );
}
