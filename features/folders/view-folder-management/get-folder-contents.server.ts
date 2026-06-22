import "server-only";

import { toApiPageError, type PageError } from "@/lib/errors/page-error";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import type { Form, FormTemplate } from "@/types";

export type FolderContents = {
  forms: readonly Form[];
  templates: readonly FormTemplate[];
};

export type FolderContentsResult =
  | { ok: true; data: FolderContents }
  | { ok: false; error: PageError };

export async function getFolderContents(
  accessToken: string | undefined,
  folderId: string,
): Promise<FolderContentsResult> {
  const api = new EndatixApi(accessToken);
  const [formsResult, templatesResult] = await Promise.all([
    api.forms.list({ folderId }),
    api.formTemplates.list({ folderId }),
  ]);

  if (!ApiResult.isSuccess(formsResult)) {
    return {
      ok: false,
      error: toApiPageError(formsResult) ?? {
        kind: "api",
        message: "Failed to load folder forms",
      },
    };
  }

  if (!ApiResult.isSuccess(templatesResult)) {
    return {
      ok: false,
      error: toApiPageError(templatesResult) ?? {
        kind: "api",
        message: "Failed to load folder templates",
      },
    };
  }

  return {
    ok: true,
    data: {
      forms: formsResult.data.items,
      templates: templatesResult.data,
    },
  };
}
