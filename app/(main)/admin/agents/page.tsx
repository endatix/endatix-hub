import PageTitle from "@/components/headings/page-title";
import AgentsList from "@/features/agents/ui/agents-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { getSession } from "@/features/auth";
import { requireAdmin } from "@/components/admin-ui/admin-protection";

export default async function AgentsPage() {
  await requireAdmin();

  return (
    <>
      <PageTitle title="Agents" />
      <div className="flex-1 space-y-2">
        <Tabs defaultValue="all" className="space-y-0">
          <div className="flex items-center justify-end space-y-0 mb-4">
            <div className="flex items-center space-x-2">
              <Link href="/admin/agents/create">
                <Button variant="default">
                  <FilePlus2 className="h-4 w-4 mr-2" />
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
  const agents = await endatixApi.agents.list();

  if (ApiResult.isError(agents)) {
    return <div className="p-8 text-destructive">{agents.error.message}</div>;
  }

  return (
    <TabsContent value="all">
      <AgentsList agents={agents.data} />
    </TabsContent>
  );
}

function AgentsSkeleton() {
  const cards = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card} className="flex flex-col gap-1 justify-between group">
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
