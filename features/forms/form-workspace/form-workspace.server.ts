import { cache } from "react";
import { auth } from "@/auth";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { EndatixApi } from "@/lib/endatix-api";
import { buildFormPageNav } from "./form-page-nav";
import { getFormWorkspaceFlags } from "./form-workspace-flags.server";
import type { FormWorkspaceSectionId } from "./form-workspace-sections";

/** One form read per request, shared by the header slot and anything else that asks. */
const getFormForHeader = cache(async (formId: string) => {
  const session = await auth();
  return new EndatixApi(session?.accessToken).forms.get(formId);
});

/** The header trail and page switcher of a form. A failed read still shows them, named "Form". */
export async function loadFormPageNav(
  formId: string,
  active?: FormWorkspaceSectionId,
) {
  const session = await auth();
  const [formResult, flags, headerData] = await Promise.all([
    getFormForHeader(formId),
    getFormWorkspaceFlags(),
    getFormsHeaderDataCached(session?.accessToken),
  ]);
  const form = formResult.success ? formResult.data : undefined;
  const folder = headerData.folders?.find((f) => f.id === form?.folderId);
  return buildFormPageNav({
    formId,
    formName: form?.name ?? "Form",
    folder,
    flags,
    active,
  });
}
