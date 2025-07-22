"use client";

import Link from "next/link";
import PageTitle from "@/components/headings/page-title";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { useTransition } from "react";
import { createAgentAction } from "@/features/agents/application/create-agent.action";
import { CreateAgentRequest } from "@/lib/endatix-api/agents/types";
import { AgentFormContainer } from "@/features/agents/ui/agent-form";
import { ApiResult } from "@/lib/endatix-api";

const INITIAL_FORM: CreateAgentRequest = {
  name: "",
  model: "",
  temperature: 0.7,
  systemPrompt: "",
  tenantId: 0,
};

export default function CreateAgentPage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = async (form: CreateAgentRequest) => {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      const result = await createAgentAction(formData);
      if (ApiResult.isSuccess(result)) {
        toast.success({
          title: "Agent created successfully",
          description: "You can now use this agent.",
        });
        router.push("/admin/agents");
      } else {
        toast.error(result.error.message || "Failed to create agent");
      }
    });
  };

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
          <AgentFormContainer
            initialValues={INITIAL_FORM}
            onSubmit={handleSubmit}
            mode="create"
            isPending={isPending}
          />
        </div>
      </div>
    </>
  );
}
