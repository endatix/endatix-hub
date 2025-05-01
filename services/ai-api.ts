import {
  DefineFormContext,
  DefineFormRequest,
} from "@/app/(main)/forms/create/use-cases/assistant";
import { getSession } from "@/features/auth";
import { HeaderBuilder } from "./header-builder";
import { redirect } from "next/navigation";

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

  const response = await fetch(`${AI_API_BASE_URL}/assistant/forms/define`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Failed to process your prompt");
  }

  return response.json();
};
