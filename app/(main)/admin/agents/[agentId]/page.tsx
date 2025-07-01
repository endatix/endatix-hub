import { getAgentConversations, getAgents } from "@/services/ai-api";
import { Conversation, Agent } from "@/features/agents/types";
import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";

interface Params {
  params: { agentId: string };
}

export default async function AgentDetailsPage({ params }: Params) {
  const agentId = params.agentId;
  let agent: Agent | undefined;
  let conversations: Conversation[] = [];
  let error: string | null = null;

  try {
    const agents = await getAgents();
    agent = agents.find((a) => String(a.id) === String(agentId));
    if (!agent) throw new Error("Agent not found");
    conversations = await getAgentConversations(agentId);
  } catch (e: unknown) {
    if (e instanceof Error) {
      error = e.message;
    } else {
      error = "Failed to load agent details";
    }
  }

  if (error) {
    return <div className="p-8 text-destructive">{error}</div>;
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex items-center justify-between mb-6">
        <PageTitle title={agent?.name || "Agent Details"} />
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/agents/${agentId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" disabled={true}>
            Delete
          </Button>
        </div>
      </div>
      <div className="bg-card border rounded-lg p-6 mb-8">
        <div className="mb-2 text-lg font-semibold">
          Model: <span className="font-normal">{agent?.model}</span>
        </div>
        <div className="mb-2">
          Temperature: <span className="font-mono">{agent?.temperature}</span>
        </div>
        <div className="mb-2">
          System Prompt:{" "}
          <span className="font-mono">{agent?.systemPrompt}</span>
        </div>
        <div className="mb-2">Created: {agent?.createdAt}</div>
        <div className="mb-2">Conversations: {conversations.length}</div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Conversations</h2>
        {conversations.length === 0 ? (
          <div className="text-muted-foreground">
            No conversations found for this agent.
          </div>
        ) : (
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">User</th>
                <th className="p-2 text-left">Messages</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">Modified</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => (
                <tr key={conv.createdAt + conv.userId} className="border-t">
                  <td className="p-2">
                    {conv.title || (
                      <span className="text-muted-foreground">(untitled)</span>
                    )}
                  </td>
                  <td className="p-2">{conv.userId}</td>
                  <td className="p-2">{conv.messagesCount}</td>
                  <td className="p-2">{conv.createdAt}</td>
                  <td className="p-2">{conv.modifiedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
