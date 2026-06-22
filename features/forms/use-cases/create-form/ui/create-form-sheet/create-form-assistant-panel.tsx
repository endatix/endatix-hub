"use client";

import { AssistantFolderSelect } from "@/features/forms/use-cases/design-form/ui/assistant-folder-select";
import ChatBox from "@/features/forms/ui/chat/chat-box";
import { Sparkles } from "lucide-react";

export function CreateFormAssistantPanel() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-4 w-4" />
        Let <span className="font-bold">Endatix AI Assistant</span> build the
        form
      </p>
      <AssistantFolderSelect />
      <ChatBox />
    </div>
  );
}
