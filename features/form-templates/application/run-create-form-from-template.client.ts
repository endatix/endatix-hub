import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  useTemplateAction,
  type UseTemplateResult,
} from "./use-template.action";

/**
 * Runs the server action to create a form from a template, shows toasts, and navigates to design on success.
 */
export async function runCreateFormFromTemplate(
  templateId: string,
  router: AppRouterInstance,
  folderId?: string,
): Promise<UseTemplateResult> {
  // useTemplateAction is a server action (not a hook); name triggers react-hooks/rules-of-hooks.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const result = await useTemplateAction({ templateId, folderId });

  if (Result.isSuccess(result)) {
    toast.success("Form created from template successfully");
    router.push(`/forms/${result.value}/design`);
  } else {
    toast.error(result.message || "Failed to create form from template");
  }

  return result;
}
