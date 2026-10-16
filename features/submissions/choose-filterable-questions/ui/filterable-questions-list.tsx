"use client";

import { Badge } from "@/components/ui/badge";
import type { SubmissionGridSearchSlots } from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  describeUserSlots,
  type FilterableQuestion,
} from "../filterable-questions";
import {
  useSearchKeyChanges,
  type SearchKeyChanges,
} from "../use-search-key-changes.hook";
import {
  RefreshSearchKeysButton,
  RemoveSearchKeyButton,
} from "./search-key-buttons";

type FilterableQuestionsListProps = {
  formId: string;
  questions: readonly FilterableQuestion[];
  slots: SubmissionGridSearchSlots;
  /** `forms.edit`: remove the questions people chose. */
  canEdit: boolean;
};

export function FilterableQuestionsList({
  formId,
  questions,
  slots,
  canEdit,
}: Readonly<FilterableQuestionsListProps>) {
  const changes = useSearchKeyChanges(formId);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SlotsUsed slots={slots} />
        <RefreshSearchKeysButton changes={changes} />
      </div>
      <QuestionRows {...{ questions, canEdit, changes }} />
    </div>
  );
}

function SlotsUsed({ slots }: Readonly<{ slots: SubmissionGridSearchSlots }>) {
  return (
    <p className="flex-1">
      {slots.used} of {slots.max} filterable. Chosen by editors:{" "}
      {describeUserSlots(slots)}. Add more from the column picker of the
      submissions grid.
    </p>
  );
}

type QuestionRowsProps = {
  questions: readonly FilterableQuestion[];
  canEdit: boolean;
  changes: SearchKeyChanges;
};

function QuestionRows({ questions, canEdit, changes }: QuestionRowsProps) {
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">None yet.</p>;
  }

  const canRemove = (question: FilterableQuestion) =>
    canEdit && question.source === "user";
  return (
    <ul className="divide-y rounded-md border">
      {questions.map((question) => (
        <QuestionRow key={question.key} question={question}>
          {canRemove(question) && (
            <RemoveSearchKeyButton target={question} changes={changes} />
          )}
        </QuestionRow>
      ))}
    </ul>
  );
}

function QuestionRow({
  question,
  children,
}: Readonly<{ question: FilterableQuestion; children: React.ReactNode }>) {
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate" title={question.key}>
        {question.title}
      </span>
      {question.preparing && <Badge variant="outline">Preparing</Badge>}
      <Badge variant="secondary">
        {question.source === "user" ? "Chosen" : "Automatic"}
      </Badge>
      {children}
    </li>
  );
}
