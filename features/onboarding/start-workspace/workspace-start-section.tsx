import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import { Result } from "@/lib/result";
import { currentWorkspaceStart } from "./workspace-api.server";
import { WorkspaceStartCard } from "./workspace-start-card";

export async function WorkspaceStartSection() {
  const current = await currentWorkspaceStart();
  if (!current) return null;
  const { result, workspace } = current;
  if (Result.isError(result)) {
    return result.requiredAction ? <StandingRefusal refusal={result.requiredAction} /> : null;
  }
  return <WorkspaceStartCard key={workspace.scope} choice={result.value} scope={workspace.scope}
    canRetry={result.value.kind === "retryable" && await workspace.canRetry()} />;
}
