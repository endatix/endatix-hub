import PageTitle from "@/components/headings/page-title";
import AgentsList from "@/features/agents/ui/agents-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { getSession } from "@/features/auth";
import { requireAdmin } from "@/components/admin-ui/admin-protection";

export default async function AgentsPage() {
  await requireAdmin();

  return (
    <>
      <PageTitle title="Agents" />
      <div className="flex-1 space-y-2">
        <Tabs defaultValue="all" className="space-y-0">
          <div className="mb-4 flex items-center justify-end space-y-0">
            <div className="flex items-center space-x-2">
              <Link href="/admin/agents/create">
                <Button variant="default">
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Create a Agent
                </Button>
              </Link>
            </div>
          </div>
          <Suspense fallback={<AgentsSkeleton />}>
            <AgentsTabsContent />
          </Suspense>
        </Tabs>
      </div>
    </>
  );
}

async function AgentsTabsContent() {
  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const agentsResult = toResult(await endatixApi.agents.list(), {
    fallbackMessage: "Failed to load agents.",
    logMessage: "Failed to load agents list.",
    loggerName: "admin.agents",
  });

  if (Result.isError(agentsResult)) {
    return <HubPageLoadError result={agentsResult} />;
  }

  return (
    <TabsContent value="all">
      <AgentsList agents={agentsResult.value} />
    </TabsContent>
  );
}

function AgentsSkeleton() {
  const cards = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card} className="group flex flex-col justify-between gap-1">
          <Skeleton className="h-[125px] w-[250px] rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
