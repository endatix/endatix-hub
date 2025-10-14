"use client";

import ChatThread from "@/features/forms/ui/chat/chat-thread";
import PreviewFormContainer from "@/app/(main)/forms/create/ui/preview-form-container";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Separator } from "@/components/ui/separator";
import { PropertyDisplay } from "@/features/submissions/ui/details/property-display";
import {
  Conversation,
  TokenUsage,
  TokenUsageSchema,
} from "@/lib/endatix-api/types";
import { formatNumber, getFormattedDate } from "@/lib/utils";
import {
  ArrowLeftIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";

const SHEET_CSS = "absolute inset-x-0 top-0 h-screen";
const CRITICAL_WIDTH = 600;

interface ConversationDetailsProps {
  formModel?: string;
  formModelError?: string;
  conversation: Conversation;
}

type TokenUsageStats = Omit<TokenUsage, "model">;

export default function ConversationDetails({
  formModel,
  formModelError,
  conversation,
}: ConversationDetailsProps) {
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tokenUsageStats: TokenUsageStats = useMemo(() => {
    return conversation.messages.reduce(
      (stats: TokenUsageStats, message) => {
        const tokenUsageValidated = TokenUsageSchema.safeParse(
          message.tokenUsage,
        );
        if (tokenUsageValidated.success) {
          stats.inputTokens += tokenUsageValidated.data.inputTokens;
          stats.outputTokens += tokenUsageValidated.data.outputTokens;
          stats.totalTokens += tokenUsageValidated.data.totalTokens;
        }
        return stats;
      },
      {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    );
  }, [conversation]);
  const chatMessages = useMemo(() => {
    return conversation.messages.map((message) => ({
      ...message,
      isAi: message.role === "assistant",
    }));
  }, [conversation]);

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < CRITICAL_WIDTH);
      if (window.innerWidth < CRITICAL_WIDTH) {
        chatPanelRef.current?.collapse();
      }
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const toggleCollapse = () => {
    const chatPanel = chatPanelRef.current;
    if (chatPanel?.isCollapsed()) {
      chatPanel.expand();
    } else {
      chatPanel?.collapse();
    }
  };

  const handleResize = (size: number) => {
    if (size > 300 && isCollapsed == false) {
      toggleCollapse();
      return;
    }
  };

  if (isMobile) {
    console.log("isMobile", isMobile);
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className={`${SHEET_CSS} flex flex-1 space-y-2`}
    >
      <ResizablePanel defaultSize={70}>
        <div className="flex h-screen sm:pl-14 lg-pl-16 sm:pt-12 md:pt-4">
          {formModel && !formModelError ? (
            <PreviewFormContainer model={formModel} />
          ) : (
            <div>
              <p>Cannot parse form model</p>
              <pre>{formModelError}</pre>
            </div>
          )}
        </div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        ref={chatPanelRef}
        defaultSize={30}
        minSize={30}
        collapsible={true}
        collapsedSize={4}
        onCollapse={() => setIsCollapsed(true)}
        onExpand={() => setIsCollapsed(false)}
        onResize={(size) => handleResize(size)}
        className="transition-all duration-300 ease-in-out"
      >
        <div className="flex h-screen shrink-0 z-50 bg-background border-l pt-6 md:px-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute sm:pl-0 pl-4 opacity-50
                        `${isMobile ? 'hidden' : 'block'}`"
            onClick={toggleCollapse}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-8 w-8 " />
            ) : (
              <ChevronRight className="h-8 w-8" />
            )}
          </Button>
          {!isCollapsed && (
            <div className="flex flex-col gap-4 sm:pt-12 p-6">
              <div className="flex flex-row gap-2 justify-between items-center">
                <h2 className="text-xl font-bold">Conversation History</h2>
                <Button variant="ghost" asChild>
                  <Link
                    href={`/admin/agents/${conversation.agentId}`}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                    Back to agent
                  </Link>
                </Button>
              </div>
              <Separator className="p-0" />
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger className="flex flex-row gap-2 justify-between items-center w-full">
                  <h3 className="text-l font-bold">Conversation Details</h3>
                  <ChevronsUpDown className="w-4 h-4" />
                  <span className="sr-only">Toggle</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <PropertyDisplay label="Created at">
                    {getFormattedDate(new Date(conversation.createdAt))}
                  </PropertyDisplay>
                  <PropertyDisplay label="Modified at">
                    {getFormattedDate(new Date(conversation.modifiedAt))}
                  </PropertyDisplay>
                  <PropertyDisplay label="User ID">
                    {conversation.userId}
                  </PropertyDisplay>
                  <PropertyDisplay label="Title">
                    {conversation.title ?? (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </PropertyDisplay>
                </CollapsibleContent>
              </Collapsible>
              <Collapsible defaultOpen={true}>
                <CollapsibleTrigger className="flex flex-row gap-2 justify-between items-center w-full">
                  <h3 className="text-l font-bold">Token Statistics</h3>
                  <ChevronsUpDown className="w-4 h-4" />
                  <span className="sr-only">Toggle</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <PropertyDisplay label="Message count">
                    {conversation.messages.length}
                  </PropertyDisplay>
                  <PropertyDisplay label="Input tokens">
                    {formatNumber(tokenUsageStats.inputTokens)}
                  </PropertyDisplay>
                  <PropertyDisplay label="Output tokens">
                    {formatNumber(tokenUsageStats.outputTokens)}
                  </PropertyDisplay>
                  <PropertyDisplay label="Total tokens used">
                    {formatNumber(tokenUsageStats.totalTokens)}
                  </PropertyDisplay>
                </CollapsibleContent>
              </Collapsible>
              <h3 className="text-l font-bold">Chat History</h3>
              <ChatThread isTyping={false} messages={chatMessages} />
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
