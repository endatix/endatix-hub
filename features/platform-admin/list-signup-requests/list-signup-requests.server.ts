import "server-only";

import { EndatixApi, isNotFoundError } from "@/lib/endatix-api";
import type { ListSignupRequestsRequest } from "@/lib/endatix-api/signup-requests/types";
import {
  normalizePagedResponse,
  type NormalizedPagedResponse,
} from "@/lib/endatix-api/shared/paged-response";
import { Result, type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { toSignupRequestView } from "../review-signup-request/signup-request-view.server";
import type { SignupRequestView } from "../review-signup-request/types";
import type { PlatformAdminSession } from "../types";

interface ListSignupRequestsOptions {
  /** Inbox only. The dashboard must see a missing route as a failed count. */
  notFoundAsEmpty?: boolean;
}

export async function listSignupRequests(
  session: PlatformAdminSession,
  request: ListSignupRequestsRequest,
  options?: ListSignupRequestsOptions,
): Promise<ResultType<NormalizedPagedResponse<SignupRequestView>>> {
  const api = new EndatixApi(session.accessToken);
  const apiResult = await api.signupRequests.list(request);
  if (options?.notFoundAsEmpty && isNotFoundError(apiResult)) {
    return Result.success(normalizePagedResponse<SignupRequestView>(null));
  }

  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load signup requests.",
    logMessage: "Failed to load signup requests.",
    loggerName: "platform-admin.signup-requests",
  });
  if (Result.isError(result)) {
    return result;
  }

  const page = normalizePagedResponse(result.value);
  return Result.success({
    ...page,
    items: page.items.map(toSignupRequestView),
  });
}
