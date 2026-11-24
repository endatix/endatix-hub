import type { Submission } from "@/lib/endatix-api";

export const submission: Submission = {
  id: "42",
  formId: "7",
  formDefinitionId: "8",
  isComplete: false,
  status: "draft",
  currentPage: 0,
  createdAt: new Date("2026-01-01"),
  token: "",
  metadata: "{}",
  jsonData: JSON.stringify({ question: "Example answer" }),
};
