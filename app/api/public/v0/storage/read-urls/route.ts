import { auth } from "@/auth";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { getClientStorageConfig } from "@/features/asset-storage/storage-runtime";
import {
  parseReadUrlsBody,
  resolveStorageGateInput,
  storageGateResultToResponse,
} from "@/features/form-access";
import { resolvePublicReadUrls } from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";

export type {
  ReadUrlResolvedEntry,
  ReadUrlsResponse,
} from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";

/**
 * Batch-resolve storage object URLs to signed GET URLs for public form respondents.
 * Requires formId and OSS-backed gate (body token or submission cookie).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const parsed = parseReadUrlsBody(
    body as Parameters<typeof parseReadUrlsBody>[0],
  );
  if (Result.isError(parsed)) {
    return apiResponses.badRequest({ detail: parsed.message });
  }

  const session = await auth();
  const gate = await resolveStorageGateInput(parsed.value.gate);
  const result = await resolvePublicReadUrls({
    gate,
    hubAccessToken: session?.accessToken,
    urls: parsed.value.urls,
    clientConfig: getClientStorageConfig(),
  });

  if (Result.isError(result)) {
    return storageGateResultToResponse(result)!;
  }

  return Response.json(result.value);
}
