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
import { ChevronLeft, ChevronRight, AlertCircle, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImperativePanelHandle } from "react-resizable-panels";
import ChatBox from "../chat/chat-box";
import ChatThread from "../chat/chat-thread";
import {
  AssistantStore,
  DefineFormCommand,
  ChatMessage,
} from "../chat/use-cases/assistant";
import DotLoader from "@/components/loaders/dot-loader";
import FormEditorContainer from "./form-editor-container";
import { ICreatorOptions } from "survey-creator-core";
import { getConversationAction } from "../../application/actions/get-conversation.action";

const CRITICAL_WIDTH = 600;

export interface FormEditorWithChatProps {
  formId: string;
  formJson: object | null;
  formName: string;
  options?: ICreatorOptions;
  slkVal?: string;
  themeId?: string;
  hasUnsavedChanges?: boolean;
  onUnsavedChanges?: (hasChanges: boolean) => void;
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
  hasUnsavedChanges,
  onUnsavedChanges,
  onThemeModificationChange,
  onSaveHandlerReady,
}: FormEditorWithChatProps) {
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shouldType, setShouldType] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [messages, setMessages] = useState(new Array<ChatMessage>());
  const [updatedFormJson, setUpdatedFormJson] = useState<object | null>(null);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const [isTranslationMode, setIsTranslationMode] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const languageInputRef = useRef<HTMLInputElement>(null);
  const propertyGridControllerRef = useRef<((visible: boolean) => void) | null>(null);

  useEffect(() => {
    const initializeConversation = async () => {
      const currentContext = await getConversationAction(formId);

      if (currentContext?.error) {
        setConversationError(currentContext.error);
        setConversationLoaded(true);
        return;
      }

      // Store in localStorage for client-side access
      const contextStore = new AssistantStore();
      contextStore.setChatContext(currentContext, formId);

      if (currentContext?.isInitialPrompt) {
        setShouldType(true);
      }

      if (currentContext?.messages) {
        setMessages(currentContext.messages);
      }

      // If form definition is empty but conversation has resultJson, load it
      if ((!formJson || Object.keys(formJson).length === 0) && currentContext?.resultJson) {
        try {
          const parsedJson = JSON.parse(currentContext.resultJson);
          setUpdatedFormJson(parsedJson);
          onUnsavedChanges?.(true);
        } catch (error) {
          console.error("Failed to parse conversation resultJson:", error);
        }
      }

      setConversationLoaded(true);
    };

    initializeConversation();

    const checkWidth = () => {
      setIsMobile(window.innerWidth < CRITICAL_WIDTH);
      if (window.innerWidth < CRITICAL_WIDTH) {
        chatPanelRef.current?.collapse();
      }
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, [formId, onUnsavedChanges]);

  const defineFormHandler = (stateCommand: DefineFormCommand, newDefinition?: object) => {
    const contextStore = new AssistantStore();
    switch (stateCommand) {
      case DefineFormCommand.fullStateUpdate:
        const formContext = contextStore.getChatContext(formId);

        setShouldType(true);
        setMessages(formContext.messages);

        if (newDefinition) {
          setUpdatedFormJson({ ...newDefinition });
          onUnsavedChanges?.(true);
        }
        break;
      default:
        break;
    }
  };

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

  const handleResize = (size: number) => {
    if (size > 300 && isCollapsed === false) {
      toggleCollapse();
      return;
    }
  };

  const handleAddLanguages = () => {
    setIsTranslationMode(true);
    setTargetLanguage("");
  };

  const handleCancelTranslation = () => {
    setIsTranslationMode(false);
    setTargetLanguage("");
  };

  // Focus language input when translation mode becomes active
  useEffect(() => {
    if (isTranslationMode) {
      languageInputRef.current?.focus();
    } else {
      chatInputRef.current?.focus();
    }
  }, [isTranslationMode]);

  // Render FormEditor if we have non empty form JSON OR after conversation is loaded
  const hasNonEmptyFormJson = formJson && Object.keys(formJson).length > 0;
  const shouldRenderEditor = hasNonEmptyFormJson || conversationLoaded;

  return (
    <div className="flex-1 flex overflow-hidden">
      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1"
      >
        <ResizablePanel defaultSize={70}>
          {shouldRenderEditor ? (
            <FormEditorContainer
              formId={formId}
              formJson={updatedFormJson || formJson}
              formName={formName}
              options={options}
              slkVal={slkVal}
              themeId={themeId}
              initialPropertyGridVisible={isCollapsed}
              hasUnsavedChanges={hasUnsavedChanges}
              onUnsavedChanges={onUnsavedChanges}
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
          ref={chatPanelRef}
          defaultSize={30}
          minSize={30}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => {
            setIsCollapsed(true);
          }}
          onExpand={() => {
            setIsCollapsed(false);
          }}
          onResize={(size) => handleResize(size)}
          className="transition-all duration-300 ease-in-out"
        >
          <div className="flex h-full shrink-0 z-50 bg-background border-l pt-6 md:px-4">
            {isCollapsed ? (
              <div className="flex flex-col items-center w-full gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`${isMobile ? "hidden" : "flex"} items-center justify-center -mt-2`}
                        onClick={toggleCollapse}
                      >
                        <ChevronLeft className="h-10 w-10 stroke-[2.5]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-white border-black">
                      <p>Show AI Assistant</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-lg font-semibold text-foreground/70 tracking-wide" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                    AI Assistant
                  </span>
                  <span className="px-1 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-full tracking-wide" style={{ writingMode: 'vertical-rl' }}>
                    Beta
                  </span>
                </div>
              </div>
            ) : null}
            {!isCollapsed && (
              <div className="flex flex-col gap-4 p-2 w-full -mt-2">
                <div className="flex items-center justify-between w-full px-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground/70">
                      AI Assistant
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
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
                      <TooltipContent className="bg-black text-white border-black">
                        <p>Hide AI Assistant</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {conversationError ? (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unable to load conversation</AlertTitle>
                    <AlertDescription>
                      {conversationError}
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
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-muted-foreground">Loading conversation...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <ChatThread isTyping={shouldType} messages={messages} />
                    {isWaiting && (
                      <DotLoader className="flex flex-none items-center m-auto" />
                    )}
                    <div className="items-center gap-2 flex justify-end">
                      {isTranslationMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-dashed"
                          onClick={handleCancelTranslation}
                          disabled={isWaiting}
                        >
                          Cancel translation
                        </Button>
                      )}
                      {!isTranslationMode && (
                        <Button
                          disabled={isWaiting}
                          variant="outline"
                          size="sm"
                          className="h-8 border-dashed"
                          onClick={handleAddLanguages}
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          Add languages
                        </Button>
                      )}
                    </div>
                    <ChatBox
                      formId={formId}
                      currentDefinition={JSON.stringify(updatedFormJson || formJson)}
                      className="flex-end flex-none"
                      placeholder="Ask for modifications to your form..."
                      onPendingChange={(pending) => {
                        setIsWaiting(pending);
                      }}
                      onStateChange={(stateCommand, newDefinition) => {
                        defineFormHandler(stateCommand, newDefinition);
                      }}
                      isTranslationMode={isTranslationMode}
                      targetLanguage={targetLanguage}
                      onTargetLanguageChange={setTargetLanguage}
                      onTranslationModeChange={setIsTranslationMode}
                      chatInputRef={chatInputRef}
                      languageInputRef={languageInputRef}
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
