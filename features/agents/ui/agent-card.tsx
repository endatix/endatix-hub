"use client";

import { Agent } from "@/lib/endatix-api/agents/types";
import { getFormattedDate } from "@/lib/utils";
import { Calendar, MessageCircle, Sparkles } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

const AgentCard = ({ agent, onClick }: AgentCardProps) => {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <div
      className="border rounded-lg p-4 bg-background shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="font-semibold text-lg mb-1">{agent.name}</div>
      <div className="text-sm text-muted-foreground">
        Tenant: {agent.tenantId}
      </div>

      <div className="text-xs text-muted-foreground mt-3 flex items-center">
        <Sparkles className="w-3 h-3 mr-1" />
        Model: {agent.model}
      </div>
      <div className="text-xs text-muted-foreground mt-1 flex items-center">
        <MessageCircle className="w-3 h-3 mr-1" />
        Conversation count: {agent.conversationsCount ?? 0}
      </div>
      <div className="text-xs text-muted-foreground mt-1 flex items-center">
        <Calendar className="w-3 h-3 mr-1" />
        Created at: {getFormattedDate(new Date(agent.createdAt))}
      </div>
    </div>
  );
};

export default AgentCard;
