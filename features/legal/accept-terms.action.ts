"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { invalidateUserAuthorizationCache } from "@/features/auth/server";
import { EndatixApi } from "@/lib/endatix-api";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import { termsVisit } from "@/lib/routes/terms-journey";
import {
  type Journey,
  pendingTerms,
  resumeWorkspace,
  signedInToken,
  termsStanding,
} from "./terms-standing.server";

export async function acceptTerms(
  display: Journey & { versionId: string },
  form: FormData,
) {
  if (!(await termsAcceptanceEnabled())) redirect("/required-actions");
  const token = await signedInToken();
  const before = await termsStanding(token);
  if (!before) return "Your account status is unavailable. Please retry.";
  if (before.scope !== display.scope) redirect("/accept-terms");
  if (!pendingTerms(before)) resumeWorkspace(before, display);
  if (form.get("accept") !== "on")
    return "Select the checkbox to accept the Terms.";
  const result = await recordAcceptance(token, display.versionId);
  if (!result.success && result.error.details?.statusCode !== 409)
    return "Could not confirm acceptance. Reload the Terms and try again.";
  invalidateUserAuthorizationCache({ userId: before.userId });
  return resumeAfterAcceptance(token, display);
}

async function recordAcceptance(token: string, versionId: string) {
  const agent = (await headers()).get("user-agent") ?? "";
  return new EndatixApi(token).post(
    "/legal/acceptances",
    { versionId },
    { headers: { "User-Agent": agent } },
  );
}

async function resumeAfterAcceptance(token: string, display: Journey) {
  const after = await termsStanding(token);
  if (!after)
    return "Could not refresh your account status. Reload to continue.";
  if (!pendingTerms(after)) resumeWorkspace(after, display);
  redirect(
    `${termsVisit(display.returnUrl ?? "/forms", after.scope)}&updated=1`,
  );
}
