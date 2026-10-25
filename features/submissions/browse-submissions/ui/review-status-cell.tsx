"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import {
  describeCollectionStatus,
  isReviewApplicable,
} from "@/features/submissions/ui/describe-collection-status";
import { changeStatusAction } from "@/features/submissions/use-cases/change-status";
import type { SubmissionGridRow } from "@/lib/endatix-api/reporting/submission-grid-types";
import { SubmissionStatus, SubmissionStatusKind } from "@/types";
import { Check, ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";

const REVIEW_OPTIONS = [
  SubmissionStatusKind.New,
  SubmissionStatusKind.Read,
  SubmissionStatusKind.Approved,
].map((kind) => SubmissionStatus.fromCode(kind));

type RowProps = { row: SubmissionGridRow };

/** The row has its own click target; picking a status must not reach it. */
const stopPropagation = (event: React.SyntheticEvent) =>
  event.stopPropagation();

export function ReviewStatusCell({ row }: Readonly<RowProps>) {
  const collection = describeCollectionStatus(
    row.collectionStatus,
    row.isComplete,
  );
  if (!isReviewApplicable(collection, row.status)) {
    return (
      <span className="text-muted-foreground">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Not reviewable until complete</span>
      </span>
    );
  }

  return <ReviewStatusMenu row={row} />;
}

function ReviewStatusMenu({ row }: Readonly<RowProps>) {
  const { status, isPending, change } = useReviewStatus(row);
  const current = SubmissionStatus.fromCode(status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={stopPropagation}>
        <ReviewStatusBadge current={current} isPending={isPending} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={stopPropagation}>
        <ReviewStatusOptions
          current={current}
          disabled={isPending}
          onSelect={change}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ReviewStatusBadgeProps = React.ComponentProps<typeof Badge> & {
  current: SubmissionStatus;
  isPending: boolean;
};

function ReviewStatusBadge(props: Readonly<ReviewStatusBadgeProps>) {
  const { current, isPending, ...triggerProps } = props;
  const Icon = isPending ? Spinner : current.icon;
  return (
    <Badge
      {...triggerProps}
      variant={current.isNew() ? "default" : "secondary"}
      className="inline-flex w-auto max-w-[150px] cursor-pointer items-center gap-1"
    >
      <Icon className="mr-1 h-3 w-3" />
      {current.label}
      <ChevronDown className="ml-1 h-3 w-3" />
    </Badge>
  );
}

type ReviewStatusOptionsProps = {
  current: SubmissionStatus;
  disabled: boolean;
  onSelect: (status: SubmissionStatusKind) => void;
};

function ReviewStatusOptions({
  current,
  ...props
}: Readonly<ReviewStatusOptionsProps>) {
  return REVIEW_OPTIONS.map((option) => (
    <ReviewStatusOption
      key={option.value}
      option={option}
      isCurrent={current.value === option.value}
      {...props}
    />
  ));
}

type ReviewStatusOptionProps = {
  option: SubmissionStatus;
  isCurrent: boolean;
  disabled: boolean;
  onSelect: (status: SubmissionStatusKind) => void;
};

function ReviewStatusOption({
  option,
  isCurrent,
  disabled,
  onSelect,
}: Readonly<ReviewStatusOptionProps>) {
  return (
    <DropdownMenuItem
      disabled={disabled || isCurrent}
      onClick={() => onSelect(option.value as SubmissionStatusKind)}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <option.icon className="h-4 w-4" />
        {option.label}
      </div>
      {isCurrent && <Check className="ml-2 h-4 w-4" />}
    </DropdownMenuItem>
  );
}

function useReviewStatus(row: SubmissionGridRow) {
  const [status, setStatus] = useState(row.status);
  const [isPending, startTransition] = useTransition();
  const change = (next: SubmissionStatusKind) =>
    startTransition(async () => {
      if (await saveReviewStatus(row, next)) {
        setStatus(next);
      }
    });

  return { status, isPending, change };
}

async function saveReviewStatus(
  row: SubmissionGridRow,
  status: SubmissionStatusKind,
): Promise<boolean> {
  const command = { submissionId: row.id, formId: row.formId, status };
  const result = await changeStatusAction(command);
  if (!result.success) {
    toast.error(result.error ?? "Failed to update status");
    return false;
  }

  toast.success(`Status updated to ${SubmissionStatus.fromCode(status).label}`);
  return true;
}
