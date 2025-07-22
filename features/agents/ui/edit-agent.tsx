"use client";
import {
  CreateUpdateAgentRequestSchema,
  UpdateAgentRequest,
} from "@/lib/endatix-api/agents/types";
import { AgentFormContainer } from "./agent-form";
import { updateAgentAction } from "../application/update-agent.action";
import { toast } from "@/components/ui/toast";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ApiResult } from "@/lib/endatix-api";

export default function EditAgent({
  agentId,
  initialValues,
}: {
  agentId: string;
  initialValues: CreateUpdateAgentRequestSchema;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(data: UpdateAgentRequest) {
    startTransition(async () => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, String(v)));
      const result = await updateAgentAction(agentId, formData);
      if (ApiResult.isSuccess(result)) {
        toast.success({
          title: "Agent updated",
          description: "Changes saved.",
        });
        router.push("/admin/agents");
      } else {
        toast.error(result.error.message || "Failed to update agent");
      }
    });
  }

  return (
    <AgentFormContainer
      initialValues={initialValues}
      onSubmit={handleSubmit}
      mode="edit"
      isPending={isPending}
    />
  );
}
