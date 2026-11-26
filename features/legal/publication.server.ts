import "server-only";
import { z } from "zod";
import { EndatixApi } from "@/lib/endatix-api";

const publication = z.object({
  versionId: z.string().regex(/^[1-9]\d*$/),
  number: z.number().int().positive(),
  markdown: z.string().min(1),
});

export async function readPublication(kind: "terms" | "privacy") {
  const result = await new EndatixApi().get<unknown>(`/public/legal/${kind}`, {
    requireAuth: false,
  });
  if (!result.success) return null;
  const parsed = publication.safeParse(result.data);
  return parsed.success ? parsed.data : null;
}
