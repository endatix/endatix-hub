"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown, EyeOff } from "lucide-react";
import { useSubmissionDetails } from "./submission-details-context";
import { formatPageTitle } from "./submission-details-nav";

type TabChangeHandler = (tabId: "answers") => void;

let globalTabChangeHandler: TabChangeHandler | null = null;

export function setSubmissionDetailsTabHandler(handler: TabChangeHandler) {
  globalTabChangeHandler = handler;
}

export function SubmissionToC() {
  const { submissionNavPages, setHighlightedQuestionName } =
    useSubmissionDetails();

  const handleQuestionClick = (questionName: string) => {
    if (globalThis.window !== undefined) {
      const url = `#${questionName}`;
      globalThis.window.history.pushState(null, "", url);
    }
    setHighlightedQuestionName(questionName);
    globalTabChangeHandler?.("answers");

    setTimeout(() => {
      const element = globalThis.window ? document.getElementById(`${questionName}`) : null;
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  };

  if (submissionNavPages.length === 0) {
    return <EmptyToC />;
  }

  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-120px)] w-72 flex-shrink-0 space-y-6 pr-4 xl:flex xl:flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Quick Navigation
        </h3>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)] rounded-[6px] p-4">
        <nav className="space-y-1">
          {submissionNavPages.map((page, index) => (
            <Collapsible key={page.pageName} defaultOpen>
              <CollapsibleTrigger
                className={cn(
                  "mt-4 flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-xs font-bold transition-all first:mt-0",
                  page.isPageInvisible
                    ? "border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                    : "border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <ChevronDown className="size-4 shrink-0" />
                {page.isPageInvisible && (
                  <EyeOff className="size-3 shrink-0 text-slate-400" />
                )}
                {formatPageTitle(index, page.pageTitle)}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5">
                {page.questions.map((question) => (
                  <button
                    key={question.name}
                    onClick={() => handleQuestionClick(question.name)}
                    className={cn(
                      "block w-full px-6 py-1.5 text-left text-xs transition-colors",
                      question.isInvisible
                        ? "text-slate-400 hover:text-slate-500"
                        : "text-slate-500 hover:text-primary",
                    )}
                  >
                    {question.isInvisible && (
                      <EyeOff className="mr-1 inline-block size-3" />
                    )}
                    {question.title}
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function EmptyToC(): React.ReactNode {
  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-120px)] w-72 flex-shrink-0 space-y-6 pr-4 xl:flex xl:flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Quick Navigation
        </h3>
      </div>

      <nav className="space-y-1">
        <div className="mt-4 flex w-full items-center gap-2 border-l-2 border-slate-200 px-3 py-2 text-left text-xs font-bold text-slate-800 transition-all first:mt-0 hover:border-slate-300 hover:bg-slate-50">
          No questions found
        </div>
      </nav>
    </aside>
  );
}
