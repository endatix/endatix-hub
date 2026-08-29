import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { getSession } from "@/features/auth/shared/auth.service";
import { getFormattedDate } from "@/lib/utils";
import { List } from "lucide-react";
import { requireAdmin } from "@/components/admin-ui/admin-protection";

interface Params {
  params: Promise<{ agentId: string }>;
}

function agentNotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Agent not found"
      notFoundSubtitle="We couldn't find that agent."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    />
  );
}

export default async function AgentDetailsPage({ params }: Params) {
  await requireAdmin();

  const { agentId } = await params;

  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const agentResult = toResult(await endatixApi.agents.get(agentId), {
    fallbackMessage: "Failed to load agent.",
    logMessage: "Failed to load agent details.",
    loggerName: "admin.agents",
  });

  if (Result.isError(agentResult)) {
    if (agentResult.statusCode === 404) {
      return agentNotFound();
    }

    return <HubPageLoadError result={agentResult} />;
  }

  const agent = agentResult.value;
  const conversationsResult = toResult(
    await endatixApi.agents.conversations.list(agentId),
    {
      fallbackMessage: "Failed to load conversations.",
      logMessage: "Failed to load agent conversations.",
      loggerName: "admin.agents",
    },
  );

  if (Result.isError(conversationsResult)) {
    return <HubPageLoadError result={conversationsResult} />;
  }

  const conversations = conversationsResult.value;

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <PageTitle title={agent.name || "Agent Details"} />
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/agents/${agentId}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" disabled={true}>
            Delete
          </Button>
        </div>
      </div>
      <div className="mb-8 rounded-lg border bg-card p-6">
        <div className="mb-4">
          <div className="mb-2 font-semibold">Model:</div>
          <div className="rounded border bg-muted/50 p-3 font-mono text-sm">
            {agent.model}
          </div>
        </div>
        <div className="mb-4">
          <div className="mb-2 font-semibold">Temperature:</div>
          <div className="rounded border bg-muted/50 p-3 font-mono text-sm">
            {agent.temperature}
          </div>
        </div>
        <div className="mb-4">
          <div className="mb-2 font-semibold">System Prompt:</div>
          <div className="rounded border bg-muted/50 p-3 font-mono text-sm break-words whitespace-pre-wrap">
            {agent.systemPrompt}
          </div>
        </div>
        <div className="mb-4">
          <div className="mb-2 font-semibold">Created:</div>
          <div className="rounded border bg-muted/50 p-3 text-sm">
            {getFormattedDate(new Date(agent.createdAt))}
          </div>
        </div>
        <div className="mb-4">
          <div className="mb-2 font-semibold">Conversations:</div>
          <div className="rounded border bg-muted/50 p-3 text-sm">
            {conversations.length}
          </div>
        </div>
      </div>
      <div>
        <h2 className="mb-4 text-xl font-semibold">Conversations</h2>
        {conversations.length === 0 ? (
          <div className="text-muted-foreground">
            No conversations found for this agent.
          </div>
        ) : (
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">User ID</th>
                <th className="p-2 text-left">Messages</th>
                <th className="p-2 text-left">Created at</th>
                <th className="p-2 text-left">Modified on</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => (
                <tr key={conv.createdAt + conv.userId} className="border-t">
                  <td className="p-2">
                    {conv.title || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-2">{conv.userId}</td>
                  <td className="p-2">{conv.messageCount}</td>
                  <td className="p-2">
                    {getFormattedDate(new Date(conv.createdAt))}
                  </td>
                  <td className="p-2">
                    {getFormattedDate(new Date(conv.modifiedAt))}
                  </td>
                  <td className="p-2">
                    <Button
                      variant="outline"
                      className="flex items-center"
                      asChild
                    >
                      <Link
                        href={`/admin/agents/${agentId}/conversations/${conv.id}`}
                      >
                        <List className="mr-2 h-4 w-4" />
                        Details
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
