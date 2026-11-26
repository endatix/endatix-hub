import { withWorkspaceSetupEntry } from "@/features/onboarding/server";
import { admitWorkspacePage } from "@/features/auth/required-actions/workspace-redirect.server";
import CreateTemplateForm from "./create-template-form";
import { authorization } from "@/features/auth/authorization";

export default async function CreateFormTemplatePage() {
  const { requireHubAccess } = await authorization();
  await admitWorkspacePage(requireHubAccess());
  return withWorkspaceSetupEntry(<CreateTemplateForm />);
}
