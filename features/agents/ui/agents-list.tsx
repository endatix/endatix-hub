"use client";

import { Agent } from "@/lib/endatix-api/agents/types";
import AgentCard from "./agent-card";
import { useRouter } from "next/navigation";

interface AgentsListProps {
  agents: Agent[];
}

const AgentsList = ({ agents }: AgentsListProps) => {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onClick={() => router.push(`/admin/agents/${agent.id}`)}
        />
      ))}
    </div>
  );
};

export default AgentsList;
