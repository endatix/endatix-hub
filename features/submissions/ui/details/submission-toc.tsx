"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  Action,
  ComputedUpdater,
  Model,
  PageModel,
  Question,
} from "survey-core";
import { useSubmissionDetails } from "./submission-details-context";

const AUTO_GENERATED_PAGE_TITLE_REGEX = /^page\d+$/i;

type TabChangeHandler = (tabId: "answers") => void;

let globalTabChangeHandler: TabChangeHandler | null = null;

export function setSubmissionDetailsTabHandler(handler: TabChangeHandler) {
  globalTabChangeHandler = handler;
}

export interface ToCItem {
  name: string;
  title: string;
  questions: ToCQuestion[];
}

export interface ToCQuestion {
  name: string;
  title: string;
}

export function buildTocItemsFromActions(
  surveyModel: Model,
  pageActions: Action[],
): ToCItem[] {
  return pageActions
    .filter((action) => action.isVisible)
    .map((action) => {
      const page = surveyModel.getPageByName(action.id!);
      if (!page) {
        return null;
      }
      return {
        name: page.name,
        title: action.title,
        questions: getTocQuestionsVisibleOnPage(page).map((q) => ({
          name: q.name,
          title: q.title || q.name,
        })),
      };
    })
    .filter((row): row is ToCItem => row !== null);
}

export function formatPageTitle(index: number, title: string): string {
  if (AUTO_GENERATED_PAGE_TITLE_REGEX.test(title)) {
    return title;
  }

  return `Page: ${String(index + 1).padStart(2, "0")}: ${title}`;
}

export function SubmissionToC() {
  const { surveyModel, setHighlightedQuestionName } = useSubmissionDetails();

  const tocPageActions = useMemo(() => {
    if (!surveyModel) return [];

    return createSubmissionTocPageActions(surveyModel);
  }, [surveyModel]);

  useEffect(() => {
    return () => {
      tocPageActions.forEach((a) => a.dispose());
    };
  }, [tocPageActions]);

  const tocItems = useMemo<ToCItem[]>(() => {
    if (!surveyModel) return [];

    return buildTocItemsFromActions(surveyModel, tocPageActions);
  }, [surveyModel, tocPageActions]);

  const handleQuestionClick = (questionName: string) => {
    if (globalThis.window !== undefined) {
      const url = `#${questionName}`;
      globalThis.window.history.pushState(null, "", url);
    }
    setHighlightedQuestionName(questionName);
    globalTabChangeHandler?.("answers");

    setTimeout(() => {
      const element = document.getElementById(`${questionName}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  };

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <aside className="sticky top-24 hidden h-[calc(100vh-120px)] w-72 flex-shrink-0 space-y-6 pr-4 xl:flex xl:flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">
          Quick Navigation
        </h3>
      </div>

      <ScrollArea className="h-[calc(100vh-120px)] rounded-md p-4">
        <nav className="space-y-1">
          {tocItems.map((page, index) => (
            <Collapsible key={page.name} defaultOpen>
              <CollapsibleTrigger className="mt-4 flex w-full items-center gap-2 border-l-2 border-slate-200 px-3 py-2 text-left text-xs font-bold text-slate-800 transition-all first:mt-0 hover:border-slate-300 hover:bg-slate-50">
                <ChevronDown className="size-4 shrink-0" />
                {formatPageTitle(index, page.title)}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5">
                {page.questions.map((question) => (
                  <button
                    key={question.name}
                    onClick={() => handleQuestionClick(question.name)}
                    className="block w-full px-6 py-1.5 text-left text-xs text-slate-500 transition-colors hover:text-primary"
                  >
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

export function createSubmissionTocPageActions(survey: Model): Action[] {
  const pages = survey.pages ?? [];
  return pages.map(
    (page) =>
      new Action({
        id: page.name,
        locTitle: page.locNavigationTitle,
        action: () => {},
        visible: new ComputedUpdater(() => page.isVisible && !page.isStartPage),
      }),
  );
}

export function getTocQuestionsVisibleOnPage(page: PageModel): Question[] {
  return page.questions.filter((q) => q.isVisibleInSurvey);
}
