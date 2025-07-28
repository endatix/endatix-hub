import { CreateUpdateAgentRequestSchema } from "@/lib/endatix-api/agents/types";
import EditAgent from "@/features/agents/ui/edit-agent";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { getSession } from "@/features/auth";
import { ApiErrorType, ApiResult } from "@/lib/endatix-api";
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
  const agentResult = await endatixApi.agents.get(agentId);

  if (ApiResult.isError(agentResult)) {
    if (agentResult.error.type === ApiErrorType.NotFoundError) {
      return <div className="p-8 text-destructive">Agent not found</div>;
    }

    return (
      <div className="p-8 text-destructive">{agentResult.error.message}</div>
    );
  }

  const agent = agentResult.data;

  const initialValues: CreateUpdateAgentRequestSchema = {
    name: agent!.name,
    tenantId: agent!.tenantId,
    model: agent!.model,
    temperature: agent!.temperature,
    systemPrompt: agent!.systemPrompt,
  };

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Agent</h1>
      <EditAgent agentId={agentId} initialValues={initialValues} />
    </div>
  );
}
