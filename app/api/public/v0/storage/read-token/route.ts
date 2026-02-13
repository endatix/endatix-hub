import { auth } from "@/auth";
import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { getStorageConfig } from "@/features/asset-storage/infrastructure/storage-config";
import { bulkGenerateReadTokens } from "@/features/asset-storage/infrastructure/storage-service";
import { resolveContainerFromUrl } from "@/features/asset-storage/utils";
import { IContainerInfo } from "@/features/asset-storage";

interface ReadTokenRequest {
  url: string;
}

interface ReadTokenResponse {
  token: string;
  expiresOn: string;
}

export async function POST(request: Request): Promise<Response> {
  const config = getStorageConfig();

  if (!config.isEnabled) {
    return apiResponses.badRequest({ detail: "Azure storage is not enabled" });
  }

  if (!config.isPrivate) {
    return Response.json({
      token: "",
      expiresOn: ""
    });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return apiResponses.unauthorized({
      detail: "You must be authenticated to access this resource",
    });
  }

  let body: ReadTokenRequest;
  try {
    body = await request.json();
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const { url } = body;
  if (!url) {
    return apiResponses.badRequest({ detail: "URL is required" });
  }

  const containerInfo = resolveContainerFromUrl(url, config);
  if (!containerInfo) {
    return apiResponses.badRequest({
      detail: "URL does not match a known storage container",
    });
  }

  const { containerName, blobName } = containerInfo;
  if (!blobName) {
    return apiResponses.badRequest({
      detail: "URL does not contain a blob path",
    });
  }

  const tokensResult = await bulkGenerateReadTokens({
    containerName,
    resourceType: "file",
    resourceNames: [blobName],
  });

  if (Result.isError(tokensResult)) {
    return apiResponses.serverError({
      detail: `Failed to generate read token: ${tokensResult.message}`,
    });
  }

  const token = tokensResult.value.readTokens[blobName];
  if (!token) {
    return apiResponses.serverError({
      detail: "Failed to generate read token for the specified blob",
    });
  }

  const response: ReadTokenResponse = {
    token,
    expiresOn: tokensResult.value.expiresOn.toISOString(),
  };

  return Response.json(response);
}
