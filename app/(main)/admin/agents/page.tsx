import PageTitle from "@/components/headings/page-title";
import { getAgents } from "@/services/ai-api";
import AgentsList from "@/features/agents/ui/agents-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent } from "@/components/ui/tabs";

export default async function AgentsPage() {
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
  const agents = await getAgents();

  return (
    <TabsContent value="all">
      <AgentsList agents={agents} />
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
