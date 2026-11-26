import { z } from "zod";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";

const choice = z.discriminatedUnion("state", [
  z.object({ state: z.enum(["offered", "working", "retryable"]), choices: z.array(z.string()), formId: z.null() }),
  z.object({
    state: z.enum(["blank", "ready"]),
    choices: z.array(z.string()),
    formId: createEndatixIdSchema("formId").nullable(),
  }),
]);

export type WorkspaceChoice = { kind: "offer" } | { kind: "working" | "retryable" } | { kind: "complete"; formId: string | null };

export function readWorkspaceChoice(payload: unknown): WorkspaceChoice | null {
  const parsed = choice.safeParse(payload);
  if (!parsed.success) return null;
  const { state, formId, choices } = parsed.data;
  switch (state) {
    case "offered": return choices.includes("blank") ? { kind: "offer" } : null;
    case "working":
    case "retryable": return { kind: state };
    default: return { kind: "complete", formId };
  }
}
