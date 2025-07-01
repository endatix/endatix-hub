import {
  DefineFormContext,
  DefineFormRequest,
} from "@/app/(main)/forms/create/use-cases/assistant";
import { getSession } from "@/features/auth";
import { HeaderBuilder } from "./header-builder";
import { redirect } from "next/navigation";
import {
  Agent,
  CreateAgentRequest,
  Conversation,
} from "@/features/agents/types";

const API_BASE_URL =
  process.env.AI_API_BASE_URL || process.env.ENDATIX_BASE_URL;
const AI_API_BASE_URL = `${API_BASE_URL}/api`;

export const defineForm = async (
  request: DefineFormRequest,
): Promise<DefineFormContext> => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(
    `${AI_API_BASE_URL}/assistant/forms/define/azure-openai`,
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to process your prompt");
  }

  return response.json();
};

export const getAgents = async (): Promise<Agent[]> => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  const headers = new HeaderBuilder().withAuth(session).build();
  const response = await fetch(`${AI_API_BASE_URL}/agents`, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch agents");
  }
  return response.json();
};

export const createAgent = async (
  request: CreateAgentRequest,
): Promise<Agent> => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();
  const response = await fetch(`${AI_API_BASE_URL}/agents`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error("Failed to create agent");
  }
  return response.json();
};

export const getAgentConversations = async (
  agentId: string | number,
): Promise<Conversation[]> => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  const headers = new HeaderBuilder().withAuth(session).build();
  const response = await fetch(
    `${AI_API_BASE_URL}/agents/${agentId}/conversations`,
    { headers },
  );
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return response.json();
};

export { AI_API_BASE_URL };
