import { auth } from "@/auth";
import { getFormsHeaderDataCached } from "@/features/folders/view-forms-header";
import { buildFormPageNav } from "./form-page-nav";
import { getFormWorkspaceFlags } from "./form-workspace-flags.server";
import type { FormWorkspaceSectionId } from "./form-workspace-sections";
import { getWorkspaceForm } from "./load-workspace-form.server";

/** The header trail and page switcher of a form. A failed read still shows them, named "Form". */
export async function loadFormPageNav(
  formId: string,
  active?: FormWorkspaceSectionId,
) {
  const session = await auth();
  const [formResult, flags, headerData] = await Promise.all([
    getWorkspaceForm(formId),
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
