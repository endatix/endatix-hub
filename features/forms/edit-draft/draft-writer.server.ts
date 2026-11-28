import "server-only";
import { auth } from "@/auth";
import {
  authorization,
  Permissions,
  isAuthenticationRequired,
  isInvalidTokenError,
} from "@/features/auth/authorization";
import { formPublishFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import type { WriteResult } from "@/lib/survey-features/draft-autosave/controller";

const signIn = {
  kind: "auth",
  message: "Sign in to the account that opened this draft.",
} as const;
type DraftClient = EndatixApi["forms"]["drafts"];
type Denied = Extract<WriteResult, { message: string }>;

export async function draftWriter(
  formId: string,
  scope: string,
): Promise<{ client: DraftClient } | Denied> {
  const session = await auth();
  if (!session?.accessToken || session.error) return signIn;
  const service = await authorization(session);
  const access = await service.checkAllPermissions([
    Permissions.Access.Hub,
    Permissions.Forms.Edit,
  ]);
  if (!access.success) {
    const kind =
      isAuthenticationRequired(access) || isInvalidTokenError(access)
        ? "auth"
        : "error";
    return { kind, message: access.error.message };
  }
  if (!(await formPublishFlag()))
    return {
      kind: "error",
      message: "Draft editing is not enabled for this deployment.",
    };
  const actor = await service.getAuthorizationData();
  if (
    !actor.success ||
    JSON.stringify([actor.data.tenantId, actor.data.userId, formId]) !== scope
  )
    return signIn;
  return { client: new EndatixApi(session.accessToken).forms.drafts };
}
