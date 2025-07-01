import { getAgents } from "@/services/ai-api";
import { AgentForm, Agent } from "@/features/agents/types";
import EditAgent from "@/features/agents/ui/edit-agent";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  let agent: Agent | undefined;
  let error: string | null = null;

  try {
    const agents = await getAgents();
    agent = agents.find((a) => String(a.id) === String(agentId));
    if (!agent) throw new Error("Agent not found");
  } catch (e: unknown) {
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = "Failed to load agent";
    }
  }

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  const initialValues: AgentForm = {
    name: agent!.name,
    model: agent!.model,
    temperature: agent!.temperature,
    systemPrompt: agent!.systemPrompt,
    tenantId: agent!.tenantId,
  };

  return (
    <div className="container max-w-2xl py-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Agent</h1>
      <EditAgent agentId={agentId} initialValues={initialValues} />
    </div>
  );
}
