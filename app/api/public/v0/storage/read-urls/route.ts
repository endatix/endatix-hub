import { auth } from "@/auth";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { getClientStorageConfig } from "@/features/asset-storage/storage-runtime";
import {
  mapGateResultToResponse,
  parsePublicReadUrlsBody,
  resolveRespondentGate,
} from "@/features/form-access/server";
import { resolvePublicReadUrls } from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";

export type {
  ReadUrlResolvedEntry,
  ReadUrlsResponse,
} from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";

/**
 * Batch-resolve storage object URLs to signed GET URLs for public form respondents.
 * Requires formId and form-access gate (body token or submission cookie).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const parsed = parsePublicReadUrlsBody(
    body as Parameters<typeof parsePublicReadUrlsBody>[0],
  );
  if (Result.isError(parsed)) {
    return apiResponses.badRequest({ detail: parsed.message });
  }

  const session = await auth();
  const gateResult = await resolveRespondentGate(parsed.value.gate, session);
  if (Result.isError(gateResult)) {
    return mapGateResultToResponse(gateResult)!;
  }

  const result = await resolvePublicReadUrls({
    gate: gateResult.value,
    hubAccessToken: session?.accessToken,
    urls: parsed.value.urls,
    clientConfig: getClientStorageConfig(),
  });

  if (Result.isError(result)) {
    return mapGateResultToResponse(result)!;
  }

  return Response.json(result.value);
}
