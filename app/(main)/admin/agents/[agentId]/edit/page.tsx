import { CreateUpdateAgentRequestSchema } from "@/lib/endatix-api/agents/types";
import EditAgent from "@/features/agents/ui/edit-agent";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { getSession } from "@/features/auth";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Result, toResult } from "@/lib/result";
import { requireAdmin } from "@/components/admin-ui/admin-protection";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  await requireAdmin();

  const { agentId } = await params;

  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const agentResult = toResult(await endatixApi.agents.get(agentId), {
    fallbackMessage: "Failed to load agent.",
    logMessage: "Failed to load agent for edit.",
    loggerName: "admin.agents",
  });

  if (Result.isError(agentResult)) {
    if (agentResult.statusCode === 404) {
      return (
        <NotFoundComponent
          notFoundTitle="Agent not found"
          notFoundSubtitle="We couldn't find that agent."
          notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
        />
      );
    }

    return <HubPageLoadError result={agentResult} />;
  }

  const agent = agentResult.value;

  const initialValues: CreateUpdateAgentRequestSchema = {
    name: agent.name,
    tenantId: agent.tenantId,
    model: agent.model,
    temperature: agent.temperature,
    systemPrompt: agent.systemPrompt,
  };

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="mb-6 text-2xl font-semibold">Edit Agent</h1>
      <EditAgent agentId={agentId} initialValues={initialValues} />
    </div>
  );
}
