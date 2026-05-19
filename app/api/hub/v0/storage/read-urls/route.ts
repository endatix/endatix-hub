import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { getClientStorageConfig } from "@/features/asset-storage/storage-runtime";
import { parseHubReadUrlsBody } from "@/features/form-access";
import { resolveHubReadUrls } from "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
/**
 * Batch-resolve storage URLs for authenticated Hub users (designer, templates, submission review).
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const isAllowedCheck = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.View,
  ]);

  if (!isAllowedCheck.success) {
    return apiResponses.forbidden({ detail: "Forbidden" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const parsed = parseHubReadUrlsBody(
    body as Parameters<typeof parseHubReadUrlsBody>[0],
  );
  if (Result.isError(parsed)) {
    return apiResponses.badRequest({ detail: parsed.message });
  }

  const result = await resolveHubReadUrls({
    scope: parsed.value.scope,
    urls: parsed.value.urls,
    clientConfig: getClientStorageConfig(),
  });

  if (Result.isError(result)) {
    return apiResponses.badRequest({ detail: result.message });
  }

  return Response.json(result.value);
}
