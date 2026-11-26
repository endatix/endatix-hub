import { HubPageLoadError } from "@/components/error-handling/error-page";
import { Result } from "@/lib/result";
import { onboardingFlag } from "@/lib/feature-flags/flags";
import { workspaceApi, workspaceResult, workspaceStartPath } from "./workspace-api.server";
import { WorkspaceStartCard } from "./workspace-start-card";

export async function WorkspaceStartSection() {
  const workspace = await workspaceApi();
  if (!workspace) return null;
  const result = workspaceResult(await workspace.api.get<unknown>(workspaceStartPath));
  if (Result.isError(result)) {
    if (result.statusCode === 404 || (result.statusCode === 403 && !result.requiredAction)) return null;
    return <HubPageLoadError result={result} />;
  }
  const card = (
    <WorkspaceStartCard choice={result.value} scope={workspace.scope} key={workspace.scope} />
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
