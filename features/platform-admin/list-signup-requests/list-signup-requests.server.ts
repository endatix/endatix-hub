import "server-only";

import { EndatixApi, isNotFoundError } from "@/lib/endatix-api";
import type {
  ListSignupRequestsRequest,
  SignupRequestListItem,
} from "@/lib/endatix-api/signup-requests/types";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "@/lib/endatix-api/shared/paged-response";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import type { PlatformAdminSession } from "../types";

export async function listSignupRequests(
  session: PlatformAdminSession,
  request: ListSignupRequestsRequest,
): Promise<ResultType<NormalizedPagedResponse<SignupRequestListItem>>> {
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.signupRequests.list(request);
  if (isNotFoundError(apiResult)) {
    return Result.success(normalizePagedResponse(null));
  }

  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load signup requests.",
    logMessage: "Failed to load signup requests.",
    loggerName: "platform-admin.signup-requests",
  });
  if (Result.isError(result)) {
    return result;
  }

  return Result.success(normalizePagedResponse(result.value));
}
