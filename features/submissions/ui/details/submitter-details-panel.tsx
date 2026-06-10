"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UserRoundSearch } from "lucide-react";
import { useMemo } from "react";
import { useSubmissionDetails } from "./submission-details-context";

const DASH_NO_DATA = "—";

function formatOptionalValue(value?: string | number | null): string {
  if (value === undefined || value === null) {
    return DASH_NO_DATA;
  }

  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : DASH_NO_DATA;
}

export function SubmitterDetailsPanel() {
  const { submission } = useSubmissionDetails();
  const profileEntries = useMemo(
    () =>
      Object.entries(submission.submitterProfile ?? {}).sort(
        ([left], [right]) => left.localeCompare(right),
      ),
    [submission.submitterProfile],
  );

  return (
    <div className="flex-grow space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Submitter
        </h2>
        <p className="text-sm text-slate-500">
          Identity and profile data captured when this submission was created.
          Profile fields are a submission-time snapshot.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SubmitterFact
          label="Submitter ID"
          value={formatOptionalValue(submission.submitterDisplayId)}
          copyValue={submission.submitterDisplayId}
        />
        <SubmitterFact
          label="Submitter record ID"
          value={formatOptionalValue(submission.submitterId)}
          copyValue={
            submission.submitterId === undefined
              ? undefined
              : String(submission.submitterId)
          }
        />
        <SubmitterFact
          label="Test submission"
          value={submission.isTestSubmission ? "Yes" : "No"}
        />
      </div>

      {profileEntries.length > 0 ? (
        <SubmitterProfileList entries={profileEntries} />
      ) : (
        <EmptySubmitterProfile />
      )}
    </div>
  );
}

interface SubmitterFactProps {
  label: string;
  value: string;
  copyValue?: string;
}

function SubmitterFact({
  label,
  value,
  copyValue,
}: Readonly<SubmitterFactProps>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          {label}
        </span>
        {copyValue && (
          <CopyToClipboard
            copyValue={copyValue}
            layout="inline"
            buttonClassName="size-6 hover:bg-slate-100 dark:hover:bg-slate-800"
          />
        )}
      </div>
      <span className="text-sm font-semibold break-all text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}

interface SubmitterProfileListProps {
  entries: [string, string][];
}

function SubmitterProfileList({
  entries,
}: Readonly<SubmitterProfileListProps>) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="col-span-5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Profile Field
        </div>
        <div className="col-span-6 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Value
        </div>
        <div className="col-span-1 text-right text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Action
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {entries.map(([name, value]) => {
          const displayValue = formatOptionalValue(value);

          return (
            <div
              key={name}
              className="group grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
            >
              <div className="col-span-5 flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-xs font-bold text-amber-600 dark:text-amber-500">
                  {name}
                </span>
              </div>
              <div className="col-span-6 min-w-0">
                <code className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                  {displayValue}
                </code>
              </div>
              <div className="col-span-1 text-right">
                <CopyToClipboard
                  copyValue={displayValue}
                  layout="inline"
                  className="opacity-0 transition-all group-hover:opacity-100"
                  buttonClassName="size-7 hover:bg-white dark:hover:bg-slate-800"
                  disabled={displayValue === DASH_NO_DATA}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptySubmitterProfile(): React.ReactNode {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundSearch className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No submitter profile</EmptyTitle>
        <EmptyDescription>
          This submission does not have captured submitter profile fields.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
