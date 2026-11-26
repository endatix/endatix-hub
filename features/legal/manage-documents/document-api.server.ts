import "server-only";
import { EndatixApi } from "@/lib/endatix-api";
import { requirePlatformAdmin } from "@/features/platform-admin/server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import type { DocumentState, Edit } from "./documents";

export const documentsPath = "/admin/legal/documents";
export const options = {
  fallbackMessage: "Could not complete the legal document request.",
  logMessage: "Legal document request failed",
  loggerName: "legal.documents",
};

export async function documentApi() {
  if (!(await termsAcceptanceEnabled())) return null;
  const session = await requirePlatformAdmin();
  return new EndatixApi(session.accessToken);
}

export function writeDocument(api: EndatixApi, edit: Edit) {
  const path = `${documentsPath}/${edit.kind}`;
  const revision = edit.revision;
  switch (edit.operation) {
    case "draft":
      return api.put<DocumentState>(`${path}/draft`, { revision, markdown: edit.markdown });
    case "required":
      return api.put<DocumentState>(`${path}/required`, {
        revision,
        required: edit.required,
      });
    case "publish":
      return api.post<DocumentState>(`${path}/versions`, {
        revision,
        change: edit.change,
      });
  }
}
