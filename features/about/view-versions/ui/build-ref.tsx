import { GitBranch, GitCommitHorizontal, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TruncatedId } from "@/components/common/truncated-id";

/** Fits a branch in the dialog's value column; the full name is in the tooltip. */
const BRANCH_VISIBLE_CHARS = 16;
const SHORT_COMMIT_LENGTH = 7;

interface BuildRefProps {
  branch: string | null;
  commit: string | null;
}

/**
 * A build that is not a release, for developers: branch and commit on their
 * own lines, each after its git mark, as `TruncatedId`s (tooltip with the full
 * value, copy on hover). Never linked — the commit may exist only in a fork.
 */
export function BuildRef({ branch, commit }: Readonly<BuildRefProps>) {
  return (
    <span className="grid justify-items-end gap-1">
      {branch && (
        <BuildRefLine icon={GitBranch} label="Branch">
          <TruncatedId
            id={branch}
            visibleChars={BRANCH_VISIBLE_CHARS}
            copyLabel="Copy branch"
          />
        </BuildRefLine>
      )}
      {commit && (
        <BuildRefLine icon={GitCommitHorizontal} label="Commit">
          <TruncatedId
            id={commit}
            truncate="prefix"
            visibleChars={SHORT_COMMIT_LENGTH}
            copyLabel="Copy commit"
          />
        </BuildRefLine>
      )}
    </span>
  );
}

function BuildRefLine({
  icon: Icon,
  label,
  children,
}: Readonly<{ icon: LucideIcon; label: string; children: ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="sr-only">{label} </span>
      {children}
    </span>
  );
}
