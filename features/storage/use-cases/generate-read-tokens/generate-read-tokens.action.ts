"use server";

import { Result } from "@/lib/result";
import { generateReadTokens } from "../../infrastructure/storage-service";
import { getStorageConfig } from "../../infrastructure/storage-config";
import { auth } from "@/auth";

interface ContainerReadToken {
  token: string;
  hostName: string;
  expiresOn: Date;
  generatedAt: Date;
}

export type ReadTokensResult = Result<ContainerReadToken>;

export async function generateReadTokensAction(
  containerName: string,
): Promise<ReadTokensResult> {
  const storageConfig = getStorageConfig();

  if (!storageConfig.isEnabled) {
    return Result.error("Azure storage is not enabled");
  }

  if (!storageConfig.isPrivate) {
    return Result.success<ContainerReadToken>({
      token: "",
      hostName: storageConfig.hostName,
      expiresOn: new Date(),
      generatedAt: new Date(),
    });
  }

  const session = await auth();
  if (!session?.user || session.error) {
    return Result.error("You are not authenticated");
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
  return Result.success<ContainerReadToken>({
    token: readToken,
    hostName: storageConfig.hostName,
    expiresOn: readTokensResult.value.expiresOn,
    generatedAt: readTokensResult.value.generatedAt,
  });
}
