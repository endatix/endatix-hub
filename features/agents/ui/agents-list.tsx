"use client";

import { Agent } from "@/features/agents/types";
import AgentCard from "./agent-card";

interface AgentsListProps {
  agents: Agent[];
}

const AgentsList = ({ agents }: AgentsListProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
};

export default AgentsList;
