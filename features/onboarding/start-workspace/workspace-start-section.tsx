import { RetryRequest } from "@/components/error-handling/retry-request";
import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import { Result } from "@/lib/result";
import { onboardingFlag } from "@/lib/feature-flags/flags";
import { currentWorkspaceStart } from "./workspace-api.server";
import { WorkspaceStartCard } from "./workspace-start-card";

export async function WorkspaceStartSection() {
  const current = await currentWorkspaceStart();
  if (!current) return null;
  const { workspace, result } = current;
  if (Result.isError(result)) return <SetupReadFailure failure={result} />;
  const card = (
    <WorkspaceStartCard choice={result.value} scope={workspace.scope} key={workspace.scope}
      canRetry={result.value.kind === "retryable" && await workspace.canRetry()} />
  );
  if (await onboardingFlag()) return card;
  // Enrollment can be paused after a workspace has received its offer.
  return (
    <details className="mb-4">
      <summary className="mb-2 cursor-pointer text-sm">Workspace setup</summary>
      {card}
    </details>
  );
}

function SetupReadFailure({ failure }: Readonly<{ failure: import("@/lib/result").Error }>) {
  if (failure.requiredAction) return <StandingRefusal refusal={failure.requiredAction} />;
  if (failure.statusCode === 404 || failure.statusCode === 403) return null;
  return <aside className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Workspace setup">
    <p>Workspace setup is temporarily unavailable.</p><RetryRequest />
  </aside>;
}
