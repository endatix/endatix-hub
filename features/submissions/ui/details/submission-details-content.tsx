"use client";

import { cn } from "@/lib/utils";
import { CustomQuestion } from "@/services/api";
import { useEffect, useState, type ReactNode } from "react";
import { getSubmissionLocale } from "@/lib/localization";
import CalculatedValuesList from "./calculated-values-list";
import DynamicVariablesList from "./dynamic-variables-list";
import { QuestionFinder } from "./question-finder";
import { SubmissionAnswers } from "./submission-answers";
import { useSubmissionDetails } from "./submission-details-context";
import { SubmitterDetailsPanel } from "./submitter-details-panel";
import {
  SubmissionToC,
  setSubmissionDetailsTabHandler,
} from "./submission-toc";
import { SubmissionViewOptions } from "./submission-view-options";

interface SubmissionDetailsContentProps {
  customQuestions: CustomQuestion[];
}

type TabId = "answers" | "submitter" | "variables" | "calculated";

const TABS: { id: TabId; label: string }[] = [
  { id: "answers", label: "Submission Answers" },
  { id: "submitter", label: "Submitter" },
  { id: "variables", label: "Dynamic Variables" },
  { id: "calculated", label: "Calculated Values" },
];

export function SubmissionDetailsContent({
  customQuestions,
}: Readonly<SubmissionDetailsContentProps>) {
  const { submission, surveyModel } = useSubmissionDetails();
  const submissionLocale = getSubmissionLocale(submission);
  const [activeTab, setActiveTab] = useState<TabId>("answers");

  useEffect(() => {
    setSubmissionDetailsTabHandler((tabId) => {
      setActiveTab(tabId);
    });

    return () => {
      setSubmissionDetailsTabHandler(() => {});
    };
  }, []);

  useEffect(() => {
    if (globalThis.window === undefined) {
      return;
    }

    const syncTabWithHash = () => {
      if (globalThis.window.location.hash.startsWith("#")) {
        setActiveTab("answers");
      }
    };

    syncTabWithHash();
    globalThis.window.addEventListener("hashchange", syncTabWithHash);
    return () =>
      globalThis.window.removeEventListener("hashchange", syncTabWithHash);
  }, []);

  if (!submission.formDefinition) {
    return <div>Form definition not found</div>;
  }

  let tabPanel: ReactNode = null;
  if (activeTab === "answers") {
    tabPanel = (
      <>
        <div className="sticky top-[73px] z-30 flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest/95 py-4 backdrop-blur">
          <QuestionFinder />
          <SubmissionViewOptions submissionLanguageName={submissionLocale} />
        </div>
        <SubmissionAnswers customQuestions={customQuestions} />
      </>
    );
  } else if (activeTab === "submitter") {
    tabPanel = <SubmitterDetailsPanel />;
  } else if (activeTab === "variables") {
    tabPanel = <DynamicVariablesList surveyModel={surveyModel} />;
  } else if (activeTab === "calculated") {
    tabPanel = <CalculatedValuesList surveyModel={surveyModel} />;
  }

  return (
    <section className="overflow-hidden rounded-md border border-border/25 bg-surface-container-lowest shadow-sm">
      <div className="flex flex-col gap-10 p-4 sm:p-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="w-full min-w-0">
            <nav className="flex w-full flex-wrap border-b border-slate-200 dark:border-slate-700">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "-mb-px flex-1 border-b-2 px-3 py-3 text-center text-sm font-medium whitespace-nowrap transition-colors sm:flex-none sm:px-6 sm:text-left",
                    activeTab === tab.id
                      ? "border-primary font-semibold text-primary"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className="mt-6">{tabPanel}</div>
          </div>
        </div>
        <SubmissionToC />
      </div>
    </section>
  );
}
