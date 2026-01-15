"use server";

import { Result } from "@/lib/result";
import { generateReadTokens } from "../../infrastructure/storage-service";
import { getStorageConfig } from "../../infrastructure/storage-config";
import { auth } from "@/auth";
import { ContainerReadToken, ReadTokensResult } from "../../types";

/**
 * Generates a read token for a container
 * @param containerName - The name of the container
 * @returns A result containing the read token and expiration information
 */
export async function generateReadTokensAction(
  containerName: string,
): Promise<ReadTokensResult> {
  const storageConfig = getStorageConfig();

  if (!storageConfig.isEnabled) {
    return Result.error("Azure storage is not enabled");
  }

  if (!storageConfig.isPrivate) {
    return Result.success(emptyReadToken(containerName));
  }

  const session = await auth();
  if (!session?.user || session.error) {
    return Result.success(emptyReadToken(containerName));
  }

  if (!containerName) {
    return Result.validationError("Container name is required");
  }

  const readTokensResult = await generateReadTokens({
    containerName,
    resourceType: "container",
    resourceNames: [containerName],
  });

  if (Result.isError(readTokensResult)) {
    return Result.error(readTokensResult.message);
  }

  const readToken = readTokensResult.value.readTokens["container"];
  return Result.success({
    token: readToken,
    expiresOn: readTokensResult.value.expiresOn,
    generatedAt: readTokensResult.value.generatedAt,
    containerName,
  });
}

function emptyReadToken(containerName: string): ContainerReadToken {
  return {
    token: null,
    expiresOn: new Date(),
    generatedAt: new Date(),
    containerName: containerName,
  };
}
