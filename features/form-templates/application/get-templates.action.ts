"use server";

import { FormTemplate } from "@/types";
import { getFormTemplates } from "@/services/api";

export async function getTemplatesAction(): Promise<FormTemplate[]> {
  try {
    return await getFormTemplates();
  } catch (error) {
    console.error("Error fetching form templates:", error);
    throw new Error("Failed to fetch form templates");
  }
} 