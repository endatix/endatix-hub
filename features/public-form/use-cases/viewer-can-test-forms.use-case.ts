import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { personalizationFlag } from "@/lib/feature-flags";
import type { Session } from "next-auth";

/**
 * The signed-in session when the viewer may test forms (`forms.test`) and personalization is on,
 * else null. The Hub asks itself: the API's `isRespondentTestMode` is only computed for private
 * forms, and Start over applies to public forms too. Never redirects, so an anonymous respondent
 * just gets null.
 * Showing Start over and running it both go through here, so the two cannot drift apart.
 */
export async function testerSessionUseCase(): Promise<Session | null> {
  if (!(await personalizationFlag())) return null;
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const allowed = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.Test,
  ]);
  return allowed.success ? session : null;
}

/** What a tester may reach from the Test inspector; null when the viewer may not test forms. */
export type TesterAccess = { canOpenParticipant: boolean };

/**
 * The tester's reach from the Test inspector, or null for anyone else. The participant page
 * needs `forms.edit` on top of the tester's grants (`PARTICIPANT_PAGE_PERMISSION` in
 * `features/audience`, which this feature cannot import without a cycle).
 */
export async function testerAccessUseCase(): Promise<TesterAccess | null> {
  const session = await testerSessionUseCase();
  if (!session) return null;
  const { checkPermission } = await authorization(session);
  const canEdit = await checkPermission(Permissions.Forms.Edit);
  return { canOpenParticipant: canEdit.success };
}
