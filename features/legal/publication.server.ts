import "server-only";
import { cache } from "react";
import { z } from "zod";
import { EndatixApi } from "@/lib/endatix-api";
import type { ApiError } from "@/lib/endatix-api";
import { isNotFoundError } from "@/lib/endatix-api/shared/api-result";
import { createEndatixIdSchema } from "@/lib/utils/type-validators";
import { toResult } from "@/lib/result";
import { TelemetryLogger } from "@/features/telemetry";

const publication = z.object({
  versionId: createEndatixIdSchema("versionId"),
  number: z.number().int().positive(),
  markdown: z.string().min(1),
  acceptanceRequired: z.boolean().optional(),
});

type PublicationRead =
  | { document: z.infer<typeof publication>; error?: never; missing?: never }
  | { document?: never; error: string; missing?: boolean };

function publicationError(result: ApiError) {
  toResult(result, {
    fallbackMessage: "The document is temporarily unavailable.",
    logMessage: "Failed to read a published legal document.",
    loggerName: "legal.publication",
  });
  const missing = isNotFoundError(result);
  return { missing, error: missing ? "No published version is available." : "The document is temporarily unavailable." };
}

export const readPublication = cache(async function readPublication(
  kind: "terms" | "privacy",
): Promise<PublicationRead> {
  const result = await new EndatixApi().get<unknown>(`/public/legal/${kind}`, {
    requireAuth: false,
  });
  if (!result.success) return publicationError(result);
  const parsed = publication.safeParse(result.data);
  if (parsed.success) return { document: parsed.data };
  TelemetryLogger.warn("Unexpected published document format.", {kind}, "legal.publication");
  return { error: "The document could not be read." };
});
