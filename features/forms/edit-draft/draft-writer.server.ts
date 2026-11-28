import "server-only";
import { auth } from "@/auth";
import {
  authorization,
  Permissions,
  isAuthenticationRequired,
  isInvalidTokenError,
} from "@/features/auth/authorization";
import { formPublishFlag } from "@/lib/feature-flags/form-publish.server";
import { EndatixApi } from "@/lib/endatix-api";
import type { WriteResult } from "@/lib/survey-features/draft-autosave/controller";

const signIn = {
  kind: "auth",
  message: "Sign in to the account that opened this draft.",
} as const;
type DraftClient = EndatixApi["forms"]["drafts"];
type Denied = Extract<WriteResult, { message: string }>;
type Access = Awaited<ReturnType<typeof authorization>>;
const grant = [Permissions.Access.Hub, Permissions.Forms.Edit];

async function editorAccess(service: Access, formId: string, scope: string): Promise<Denied | undefined> {
  const access = await service.checkAllPermissions(grant);
  if (!access.success) {
    const kind = isAuthenticationRequired(access) || isInvalidTokenError(access) ? "auth" : "error";
    return { kind, message: access.error.message };
  }
  const actor = await service.getAuthorizationData();
  if (!actor.success || JSON.stringify([actor.data.tenantId, actor.data.userId, formId]) !== scope) return signIn;
}

export async function draftWriter(
  formId: string,
  scope: string,
): Promise<{ client: DraftClient } | Denied> {
  const session = await auth();
  if (!session?.accessToken || session.error) return signIn;
  const service = await authorization(session);
  const denied = await editorAccess(service, formId, scope);
  if (denied) return denied;
  if (!(await formPublishFlag()))
    return {
      kind: "modeChanged",
      message: "The editor mode changed. Your draft is kept on this device. Download a copy before reopening the designer.",
    };
  return { client: new EndatixApi(session.accessToken).forms.drafts };
}
