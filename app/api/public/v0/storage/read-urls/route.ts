import { auth } from "@/auth";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { getClientStorageConfig } from "@/features/asset-storage/storage-runtime";
import {
  mapGateResultToResponse,
  parsePublicReadUrlsBody,
  resolveAuthoredImageGate,
  resolvePublicStorageGate,
} from "@/features/form-access/server";
import { resolvePublicReadUrls } from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";

export type {
  ReadUrlResolvedEntry,
  ReadUrlsResponse,
} from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";

async function parseReadBatch(request: Request): Promise<ReturnType<typeof parsePublicReadUrlsBody>> {
  try {
    const body = await request.json();
    return parsePublicReadUrlsBody(body);
  } catch {
    return Result.validationError("Invalid JSON body");
  }
}

/** Batch-resolve private storage reads for a public form respondent. */
export async function POST(request: Request): Promise<Response> {
  const parsed = await parseReadBatch(request);
  if (Result.isError(parsed)) {
    return apiResponses.badRequest({ detail: parsed.message });
  }

  const session = await auth();
  const resolveGate = parsed.value.richTextImages ? resolveAuthoredImageGate : resolvePublicStorageGate;
  const gateResult = await resolveGate(parsed.value.gate, session);
  if (Result.isError(gateResult)) {
    return mapGateResultToResponse(gateResult)!;
  }

  const result = await resolvePublicReadUrls({
    gate: gateResult.value,
    hubAccessToken: session?.accessToken,
    urls: parsed.value.urls,
    richTextImages: parsed.value.richTextImages,
    clientConfig: getClientStorageConfig(),
  });

  if (Result.isError(result)) {
    return mapGateResultToResponse(result)!;
  }

  return Response.json(result.value);
}
