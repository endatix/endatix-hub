import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getSession } from "@/features/auth";

interface Params {
  params: { agentId: string };
}

export default async function AgentDetailsPage({ params }: Params) {
  const agentId = params.agentId;

  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const agent = await endatixApi.agents.get(agentId);

  if (ApiResult.isError(agent)) {
    if (agent.error.type === ApiErrorType.NotFoundError) {
      return <div className="p-8 text-destructive">Agent not found</div>;
    }

    return <div className="p-8 text-destructive">{agent.error.message}</div>;
  }

  const conversations = await endatixApi.agents.conversations.list(agentId);
  if (ApiResult.isError(conversations)) {
    return (
      <div className="p-8 text-destructive">{conversations.error.message}</div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="flex items-center justify-between mb-6">
        <PageTitle title={agent.data.name || "Agent Details"} />
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
          Model: <span className="font-normal">{agent.data.model}</span>
        </div>
        <div className="mb-2">
          Temperature: <span className="font-mono">{agent.data.temperature}</span>
        </div>
        <div className="mb-2">
          System Prompt:{" "}
          <span className="font-mono">{agent.data.systemPrompt}</span>
        </div>
        <div className="mb-2">Created: {agent.data.createdAt}</div>
        <div className="mb-2">Conversations: {conversations.data.length}</div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Conversations</h2>
        {conversations.data.length === 0 ? (
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
              {conversations.data.map((conv) => (
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
