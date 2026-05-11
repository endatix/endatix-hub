import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { EndatixApi } from "../endatix-api";
import { ApiResult } from "../shared/api-result";
import type { CreateFolderRequest, Folder, UpdateFolderRequest } from "./types";

export class Folders {
  constructor(private readonly endatix: EndatixApi) {}

  /**
   * Lists folders. Default: active only. Pass includeInactive with folders.manage on the API.
   */
  async list(options?: {
    includeInactive?: boolean;
  }): Promise<ApiResult<Folder[]>> {
    const params = new URLSearchParams();
    if (options?.includeInactive) {
      params.set("includeInactive", "true");
    }
    const path = params.size > 0 ? `/folders?${params.toString()}` : "/folders";
    return this.endatix.get<Folder[]>(path);
  }

  async getBySlug(slug: string): Promise<ApiResult<Folder>> {
    const trimmed = slug?.trim();
    if (!trimmed) {
      return ApiResult.validationError("Slug is required");
    }
    return this.endatix.get<Folder>(
      `/folders/by-slug/${encodeURIComponent(trimmed)}`,
    );
  }

  async create(request: CreateFolderRequest): Promise<ApiResult<Folder>> {
    return this.endatix.post<Folder>("/folders", request);
  }

  async update(
    folderId: string,
    request: UpdateFolderRequest,
  ): Promise<ApiResult<Folder>> {
    const idResult = validateEndatixId(folderId, "folderId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }
    return this.endatix.patch<Folder>(`/folders/${idResult.value}`, request);
  }

  async delete(folderId: string): Promise<ApiResult<string>> {
    const idResult = validateEndatixId(folderId, "folderId");
    if (Result.isError(idResult)) {
      return ApiResult.validationError(idResult.message);
    }
    return this.endatix.delete<string>(`/folders/${idResult.value}`);
  }
}
