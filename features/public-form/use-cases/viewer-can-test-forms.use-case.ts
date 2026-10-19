import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import type { Session } from "next-auth";

/**
 * The signed-in session when the viewer may test forms (`forms.test`), else null. The Hub asks
 * itself: the API's `isRespondentTestMode` is only computed for private forms, and Start over
 * applies to public forms too. Never redirects, so an anonymous respondent just gets null.
 * Showing Start over and running it both go through here, so the two cannot drift apart.
 */
export async function testerSessionUseCase(): Promise<Session | null> {
  const session = await auth();
  const { checkAllPermissions } = await authorization(session);
  const allowed = await checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.Test,
  ]);
  return allowed.success ? session : null;
}

/** Whether the signed-in viewer may test forms (`forms.test`). */
export async function viewerCanTestFormsUseCase(): Promise<boolean> {
  return (await testerSessionUseCase()) !== null;
}
