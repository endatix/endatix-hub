import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";

/**
 * Whether the signed-in viewer may test forms (`forms.test`). The Hub asks itself: the API's
 * `isRespondentTestMode` is only computed for private forms, and Start over applies to public
 * forms too. Never redirects, so an anonymous respondent just gets `false`.
 */
export async function viewerCanTestFormsUseCase(): Promise<boolean> {
  const { checkAllPermissions } = await authorization(await auth());
  const allowed = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.Test,
  ]);
  return allowed.success;
}
