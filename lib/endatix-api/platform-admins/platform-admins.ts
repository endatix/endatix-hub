import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import type { EndatixApi } from "../endatix-api";
import {
  ApiResult,
  type ApiResult as ApiResultType,
} from "../shared/api-result";
import { buildQueryEndpoint } from "../shared/query-params";
import type { PagedResponse } from "../shared/types";
import type {
  ListPlatformAdminsRequest,
  PlatformAdminOperationResponse,
  PlatformAdminUserListItem,
} from "./types";

export default class PlatformAdmins {
  constructor(private readonly endatix: EndatixApi) {}

  async list(
    request: ListPlatformAdminsRequest = {},
  ): Promise<ApiResultType<PagedResponse<PlatformAdminUserListItem>>> {
    return this.endatix.get<PagedResponse<PlatformAdminUserListItem>>(
      buildQueryEndpoint("/admin/platform-admins", [
        ["page", request.page],
        ["pageSize", request.pageSize],
        ["search", request.search],
      ]),
    );
  }

  async listCandidates(
    request: ListPlatformAdminsRequest = {},
  ): Promise<ApiResultType<PagedResponse<PlatformAdminUserListItem>>> {
    return this.endatix.get<PagedResponse<PlatformAdminUserListItem>>(
      buildQueryEndpoint("/admin/platform-admins/candidates", [
        ["page", request.page],
        ["pageSize", request.pageSize],
        ["search", request.search],
      ]),
    );
  }

  async grant(
    userId: string,
  ): Promise<ApiResultType<PlatformAdminOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }

    return this.endatix.post<PlatformAdminOperationResponse>(
      `/admin/platform-admins/${userId}`,
      {},
    );
  }

  async revoke(
    userId: string,
  ): Promise<ApiResultType<PlatformAdminOperationResponse>> {
    const validateResult = validateEndatixId(userId, "userId");
    if (Result.isError(validateResult)) {
      return ApiResult.validationError(validateResult.message);
    }

    return this.endatix.delete<PlatformAdminOperationResponse>(
      `/admin/platform-admins/${userId}`,
    );
  }
}
