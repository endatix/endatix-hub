import { NextRequest, NextResponse } from "next/server";
import { Session } from "next-auth";
import { auth } from "@/auth";
import { apiResponses } from "@/lib/utils/route-handlers";
import { Result } from "@/lib/result";
import { ApiResult } from "@/lib/endatix-api";
import { generateUploadUrl } from "../../server";
import { generateUniqueFileName } from "../../utils";
import { TokenOperationResult } from "../../types";
import { AuthorizationResult } from "@/features/auth";
import { TokenContext, TokenStrategy } from "./types";

export async function generateTokens(
  containerName: string,
  folderPath: string,
  fileNames: string[],
): Promise<Record<string, TokenOperationResult>> {
  const sasTokens: Record<string, TokenOperationResult> = {};

  for (const fileName of fileNames) {
    const uniqueFileNameResult = generateUniqueFileName(fileName);

    if (Result.isError(uniqueFileNameResult)) {
      sasTokens[fileName] = {
        success: false,
        message: uniqueFileNameResult.message,
      };
      continue;
    }

    try {
      const sasUrl = await generateUploadUrl({
        containerName,
        folderPath,
        fileName: uniqueFileNameResult.value,
      });
      sasTokens[fileName] = { success: true, url: sasUrl };
    } catch (error) {
      sasTokens[fileName] = {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  return sasTokens;
}

export async function executeTokenFlow<TRequest, TResponseExtras>(
  request: NextRequest,
  strategy: TokenStrategy<TRequest, TResponseExtras>,
): Promise<NextResponse> {
  const session = await auth();
  const data: TRequest = await request.json();

  const ctx: TokenContext<TRequest> = { request, data, session };

  const validationResult = strategy.validate(data);
  if (Result.isError(validationResult)) {
    return apiResponses.badRequest({ detail: validationResult.message });
  }

  const authResult = await strategy.authorize(ctx);
  if (AuthorizationResult.isError(authResult)) {
    return apiResponses.forbidden({ detail: authResult.error.message });
  }

  const storageResult = await strategy.resolveStorage(ctx);
  if (ApiResult.isError(storageResult)) {
    return apiResponses.badRequest({
      detail: ApiResult.getErrorMessage(storageResult) ?? undefined,
    });
  }

  const { containerName, folderPath, extra } = storageResult.data;
  const fileNames = strategy.getFileNames(data);
  const tokens = await generateTokens(containerName, folderPath, fileNames);

  return NextResponse.json({
    tokens,
    ...extra,
  });
}
