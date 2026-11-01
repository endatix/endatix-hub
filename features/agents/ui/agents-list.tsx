import { Agent } from "@/lib/endatix-api/agents/types";
import AgentCard from "./agent-card";
import type { Route } from "next";

interface AgentsListProps {
  agents: Agent[];
}

const AgentsList = ({ agents }: AgentsListProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          href={`/admin/agents/${agent.id}` as Route}
        />
      ))}
    </div>
  );
};

export default AgentsList;
