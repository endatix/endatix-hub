import { StandingRefusal } from "@/components/error-handling/standing-refusal";
import { RetryRequest } from "@/components/error-handling/retry-request";
import { Result } from "@/lib/result";
import { currentWorkspaceStart } from "./workspace-api.server";
import { WorkspaceStartCard } from "./workspace-start-card";

export async function WorkspaceStartSection() {
  const current = await currentWorkspaceStart();
  if (!current) return null;
  const { result, workspace } = current;
  if (Result.isError(result)) {
    if (result.requiredAction) return <StandingRefusal refusal={result.requiredAction} />;
    if ([401, 403, 404].includes(result.statusCode ?? 0)) return null;
    return <section className="mx-auto grid max-w-xl gap-4 rounded-[20px] border bg-card p-8">
      <h1 className="text-2xl font-semibold">Workspace setup is temporarily unavailable</h1>
      <p>Try again to check the status of your workspace.</p><RetryRequest />
    </section>;
  }
  return <WorkspaceStartCard key={workspace.scope} choice={result.value} scope={workspace.scope}
    canRetry={result.value.kind === "retryable" && await workspace.canRetry()} />;
}
