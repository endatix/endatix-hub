"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import ChatBox from "../chat/chat-box";
import { AssistantFolderSelect } from "@/features/forms/use-cases/design-form/ui/assistant-folder-select";
import ChatThread from "../chat/chat-thread";
import DotLoader from "@/components/loaders/dot-loader";
import FormEditorContainer from "./form-editor-container";
import { useSurveyDesigner } from "@/lib/survey-features/designer/design-survey.context";
import { ICreatorOptions } from "survey-creator-core";
import { useFormAssistant } from "../../use-cases/design-form/form-assistant.context";

const CRITICAL_WIDTH = 600;

export interface FormEditorWithChatProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
  isPublic?: boolean;
  formIsEnabled?: boolean;
  onThemeModificationChange?: (isModified: boolean) => void;
  onSaveHandlerReady?: (saveHandler: () => Promise<void>) => void;
}

export default function FormEditorWithChat({
  formId,
  formJson,
  formName,
  options,
  slkVal,
  themeId,
  isPublic,
  formIsEnabled,
  onThemeModificationChange,
  onSaveHandlerReady,
}: FormEditorWithChatProps) {
  const { setHasUnsavedChanges } = useSurveyDesigner();
  const chatPanelRef = useRef<PanelImperativeHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [updatedFormJson, setUpdatedFormJson] = useState<object | null>(
    formJson,
  );
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const propertyGridControllerRef = useRef<((visible: boolean) => void) | null>(
    null,
  );
  const { chatContext } = useFormAssistant();
  const isGeneratingResponse = chatContext?.isResponsePending ?? false;
  const hasNonEmptyFormJson = formJson && Object.keys(formJson).length > 0;
  const shouldRenderEditor = hasNonEmptyFormJson || conversationLoaded;

  useEffect(() => {
    const initializeConversation = async () => {
      if (chatContext?.error) {
        setConversationLoaded(true);
        return;
      }

      // If form definition is empty but conversation has resultJson, load it
      if (chatContext?.resultDefinition) {
        setUpdatedFormJson(chatContext?.resultDefinition);
        setHasUnsavedChanges(true);
      }
      setConversationLoaded(true);
    };

    initializeConversation();
  }, [
    chatContext?.error,
    chatContext?.formId,
    chatContext?.resultDefinition,
    setHasUnsavedChanges,
  ]);

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
      // Hide property grid immediately before expanding
      propertyGridControllerRef.current?.(false);
      chatPanel.expand();
    } else {
      // Show property grid immediately before collapsing
      propertyGridControllerRef.current?.(true);
      chatPanel?.collapse();
    }
  };

  const handleResize = (panelSize: {
    asPercentage: number;
    inPixels: number;
  }) => {
    if (panelSize.inPixels > 300 && isCollapsed === false) {
      toggleCollapse();
      return;
    }
    setIsCollapsed(panelSize.asPercentage <= 4);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        <ResizablePanel defaultSize={70}>
          {shouldRenderEditor ? (
            <FormEditorContainer
              formId={formId}
              formJson={updatedFormJson}
              formName={formName}
              options={options}
              slkVal={slkVal}
              themeId={themeId}
              isPublic={isPublic}
              formIsEnabled={formIsEnabled}
              initialPropertyGridVisible={isCollapsed}
              onThemeModificationChange={onThemeModificationChange}
              onSaveHandlerReady={onSaveHandlerReady}
              onPropertyGridControllerReady={(controller) => {
                propertyGridControllerRef.current = controller;
              }}
            />
          ) : null}
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel
          panelRef={chatPanelRef}
          defaultSize={30}
          minSize={30}
          collapsible={true}
          collapsedSize={4}
          onResize={(panelSize) => handleResize(panelSize)}
          className="transition-all duration-300 ease-in-out"
        >
          <div className="z-50 flex h-full shrink-0 border-l bg-background pt-6 md:px-4">
            {isCollapsed ? (
              <div className="flex w-full flex-col items-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`${
                          isMobile ? "hidden" : "flex"
                        } -mt-2 items-center justify-center`}
                        onClick={toggleCollapse}
                      >
                        <ChevronLeft className="h-10 w-10 stroke-[2.5]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="border-black bg-black text-white">
                      <p>Show AI Assistant</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="text-lg font-semibold tracking-wide text-foreground/70"
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }}
                  >
                    AI Assistant
                  </span>
                  <span
                    className="rounded-full bg-primary px-1 py-2 text-xs font-medium tracking-wide text-primary-foreground"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    Beta
                  </span>
                </div>
              </div>
            ) : null}
            {!isCollapsed && (
              <div className="-mt-2 flex w-full flex-col gap-4 p-2">
                <div className="flex w-full items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground/70">
                      AI Assistant
                    </span>
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                      Beta
                    </span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${isMobile ? "hidden" : "flex"}`}
                          onClick={toggleCollapse}
                        >
                          <ChevronRight className="h-6 w-6 stroke-[2.5]" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="border-black bg-black text-white">
                        <p>Hide AI Assistant</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {chatContext?.error ? (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unable to load conversation</AlertTitle>
                    <AlertDescription>
                      {chatContext?.error}
                      <br />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.location.reload()}
                      >
                        Refresh page
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : !conversationLoaded ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      <p className="text-muted-foreground">
                        Loading conversation...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ChatThread />
                    <AssistantFolderSelect />
                    {isGeneratingResponse && (
                      <DotLoader className="m-auto flex flex-none items-center" />
                    )}
                    <ChatBox
                      currentDefinition={JSON.stringify(
                        updatedFormJson || formJson,
                      )}
                      className="flex-end flex-none"
                      placeholder="Ask for modifications to your form..."
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
