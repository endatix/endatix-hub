import { z } from "zod";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";

const choice = z.discriminatedUnion("state", [
  z.object({ state: z.literal("offered"), choices: z.array(z.string()), formId: z.null() }),
  z.object({
    state: z.literal("blank"),
    choices: z.array(z.string()),
    formId: createEndatixIdSchema("formId").nullable(),
  }),
]);

export type WorkspaceChoice = { kind: "offer" } | { kind: "complete"; formId: string | null };

export function readWorkspaceChoice(payload: unknown): WorkspaceChoice | null {
  const parsed = choice.safeParse(payload);
  if (!parsed.success) return null;
  if (parsed.data.state === "blank") return { kind: "complete", formId: parsed.data.formId };
  return parsed.data.choices.includes("blank") ? { kind: "offer" } : null;
}
