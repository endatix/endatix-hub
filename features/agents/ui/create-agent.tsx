"use client";

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
  temperature: 1,
  systemPrompt: "",
  tenantId: 0,
};

export default function CreateAgent() {
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
        toast.error(result.error.message ?? "Failed to create agent");
      }
    });
  };

  return (
    <AgentFormContainer
      initialValues={INITIAL_FORM}
      onSubmit={handleSubmit}
      mode="create"
      isPending={isPending}
    />
  );
}
