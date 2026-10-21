import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { personalizationFlag } from "@/lib/feature-flags";

/**
 * Whether the signed-in viewer may open a participant's page: it needs `forms.edit` and
 * personalization on, and redirects otherwise, so Submission Details hides Open participant
 * rather than leave a dead end. Never redirects itself.
 */
export async function viewerCanOpenParticipantUseCase(): Promise<boolean> {
  if (!(await personalizationFlag())) return false;
  const { checkPermission } = await authorization(await auth());
  return (await checkPermission(Permissions.Forms.Edit)).success;
}
