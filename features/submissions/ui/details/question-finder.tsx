"use client";

import { KeyboardDetails } from "@/components/product-ui/keyboard-details";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { EyeOff, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuestionNonValue } from "survey-core";
import { getQuestionNumber } from "../../submission-utils";
import {
  useSubmissionDetails,
  useSubmissionDetailsViewOptions,
} from "./submission-details-context";

interface QuestionItem {
  name: string;
  title: string;
  type: string;
  number: number;
  isInvisible: boolean;
}

interface PageGroup {
  name: string;
  title: string;
  isPageInvisible: boolean;
  questions: QuestionItem[];
}

function syncHighlightFromHash(
  setHighlightedQuestionName: (name: string | null) => void,
) {
  const hash = globalThis.window?.location.hash;
  if (hash?.startsWith("#")) {
    setHighlightedQuestionName(decodeURIComponent(hash.slice(3)));
  } else {
    setHighlightedQuestionName(null);
  }
}

function buildQuestionNumberByName(
  allQuestions: QuestionNonValue[],
): Map<string, number> {
  const numbersMap = new Map<string, number>();

  allQuestions?.forEach((question) => {
    const number = getQuestionNumber(question);
    numbersMap.set(question.name, number);
  });

  return numbersMap;
}

export function QuestionFinder() {
  const { allQuestions, submissionNavPages, setHighlightedQuestionName } =
    useSubmissionDetails();
  const { viewOptions } = useSubmissionDetailsViewOptions();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const questionNumberByName = useMemo(
    () => buildQuestionNumberByName(allQuestions as QuestionNonValue[]),
    [allQuestions],
  );

  const pagesWithQuestions = useMemo<PageGroup[]>(() => {
    return submissionNavPages
      .map((page) => {
        const questions = page.questions
          .filter((q) => !(q.question instanceof QuestionNonValue))
          .map((q) => {
            const num = questionNumberByName.get(q.name);
            if (num === undefined) {
              return null;
            }
            return {
              name: q.name,
              title: q.title,
              type: q.question.getType(),
              number: num,
              isInvisible: q.isInvisible,
            };
          })
          .filter((q): q is QuestionItem => q !== null);

        return {
          name: page.pageName,
          title: page.pageTitle,
          isPageInvisible: page.isPageInvisible,
          questions,
        };
      })
      .filter((page) => page.questions.length > 0);
  }, [submissionNavPages, questionNumberByName]);

  const handleSelect = useCallback(
    (questionName: string) => {
      setOpen(false);
      setHighlightedQuestionName(questionName);
      const element = document.getElementById(`${questionName}`);
      if (element) {
        const url = `#${questionName}`;
        globalThis.window?.history.pushState(null, "", url);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [setHighlightedQuestionName],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      syncHighlightFromHash(setHighlightedQuestionName);
      const hash = globalThis.window?.location.hash;
      if (hash.startsWith("#")) {
        const questionName = decodeURIComponent(hash.slice(3));
        const element = document.getElementById(`${questionName}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };

    syncHighlightFromHash(setHighlightedQuestionName);
    globalThis.window?.addEventListener("hashchange", handleHashChange);
    return () => globalThis.window?.removeEventListener("hashchange", handleHashChange);
  }, [setHighlightedQuestionName]);

  return (
    <>
      <div className="group relative min-w-0 flex-1">
        <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" />
        <Button
          variant="outline"
          className="w-full justify-start rounded-[6px] border-none bg-surface-container-low py-3 pr-4 pl-12 text-left text-sm text-slate-400 transition-all focus-visible:ring-2 focus-visible:ring-primary/20"
          onClick={() => setOpen(true)}
        >
          Jump to Question...
        </Button>
        <KeyboardDetails
          defaultKeys={["Ctrl", "K"]}
          macOsSpecificKeys={["⌘", "K"]}
        />
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search by title, type, or #12…"
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          <CommandEmpty>No questions found.</CommandEmpty>
          {pagesWithQuestions.map((page) => (
            <CommandGroup
              key={page.name}
              heading={
                <div className="flex items-center gap-2">
                  <span>{page.title}</span>
                  {page.isPageInvisible && viewOptions.showInvisibleItems && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <EyeOff className="size-3" />
                      Invisible
                    </span>
                  )}
                </div>
              }
            >
              {page.questions.map((question) => (
                <CommandItem
                  key={question.name}
                  keywords={
                    question.number > 0
                      ? [
                          String(question.number),
                          `#${question.number}`,
                          question.name,
                        ]
                      : [question.name]
                  }
                  value={
                    question.number > 0
                      ? `${question.name} ${question.number} #${question.number} ${question.title} ${question.type}`
                      : `${question.name} ${question.title} ${question.type}`
                  }
                  onSelect={() => handleSelect(question.name)}
                  className="flex cursor-pointer items-center gap-3"
                >
                  {question.number > 0 ? (
                    <span className="shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                      #{question.number}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground/50">
                      —
                    </span>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {question.isInvisible &&
                        viewOptions.showInvisibleItems && (
                          <EyeOff className="mr-1 inline-block size-1 text-slate-400" />
                        )}
                      {question.title}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {question.type}
                    </span>
                  </div>
                  <CommandShortcut className="opacity-50">
                    <Search className="size-3" />
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
