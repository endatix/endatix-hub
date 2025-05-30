"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AgentChatBox } from "@/features/forms/ui/agent-chat-box";
import { useState } from "react";

export function AgentChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">Open Endatix Assistant</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col" aria-describedby="chat-description">
        <DialogHeader>
          <DialogTitle>Endatix Assistant</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <AgentChatBox
            className="h-full"
            placeholder="How can I help you today?"
            onPendingChange={(pending: boolean) => {
              // Handle pending state if needed
            }}
          />
        </div>
        <p id="chat-description" className="sr-only">
          Chat with the Endatix assistant to get help with your tasks
        </p>
      </DialogContent>
    </Dialog>
  );
}
