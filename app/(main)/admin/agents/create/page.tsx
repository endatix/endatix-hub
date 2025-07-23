"use server";

import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { requireAdmin } from "@/components/admin-ui/admin-protection";
import CreateAgent from "@/features/agents/ui/create-agent";

export default async function CreateAgentPage() {
  await requireAdmin();

  return (
    <>
      <PageTitle title="Create Agent" />
      <div className="container max-w-2xl py-6">
        <div className="mb-6">
          <Link href="/admin/agents" className="text-primary hover:underline">
            ← Back to agents
          </Link>
        </div>
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-6">Create a new agent</h1>
          <p className="text-muted-foreground mb-6">
            Agents let you configure LLMs with custom settings and system
            messages.
          </p>
          <CreateAgent />
        </div>
      </div>
    </>
  );
}
