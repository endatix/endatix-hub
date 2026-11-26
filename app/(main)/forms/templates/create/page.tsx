import { withWorkspaceSetupAfter } from "@/features/onboarding/server";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import CreateTemplateForm from "./create-template-form";
import { authorization } from "@/features/auth/authorization";
import { getTemplateCreateContextAction } from "@/features/form-templates/application/get-template-create-context.action";
import { Result } from "@/lib/result";

export default async function CreateFormTemplatePage() {
  const { requireHubAccess } = await authorization();
  await admitWorkspacePage(requireHubAccess());
  const context = await getTemplateCreateContextAction();
  return withWorkspaceSetupAfter(
    Result.isSuccess(context),
    <CreateTemplateForm context={context} />,
  );
}
