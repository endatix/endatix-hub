import "server-only";
import { z } from "zod";
import { EndatixApi } from "@/lib/endatix-api";
import { isNotFoundError } from "@/lib/endatix-api/shared/api-result";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";

const publication = z.object({
  versionId: createEndatixIdSchema("versionId"),
  number: z.number().int().positive(),
  markdown: z.string().min(1),
});

export async function readPublication(kind: "terms" | "privacy") {
  const result = await new EndatixApi().get<unknown>(`/public/legal/${kind}`, {
    requireAuth: false,
  });
  if (!result.success)
    return {
      error: isNotFoundError(result)
        ? "No published version is available."
        : "The document is temporarily unavailable.",
    } as const;
  const parsed = publication.safeParse(result.data);
  return parsed.success
    ? { document: parsed.data }
    : { error: "The document could not be read." };
}
