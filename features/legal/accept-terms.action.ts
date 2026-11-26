"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { invalidateUserAuthorizationCache } from "@/features/auth/server";
import { EndatixApi } from "@/lib/endatix-api";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";
import { termsVisit } from "@/lib/routes/terms-journey";
import { confirmedScope } from "@/lib/routes/workspace-scope.server";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Result, toResult } from "@/lib/result";
import {
  type Journey,
  pendingTerms,
  resumeWorkspace,
  signedInToken,
  scopedDestination,
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
  if (![before.scope, before.homeScope].includes(display.scope)) redirect("/accept-terms");
  if (!pendingTerms(before)) resumeWorkspace(before, {});
  if (form.get("accept") !== "on")
    return "Select the checkbox to accept the Terms.";
  if (Result.isError(validateEndatixId(display.versionId, "versionId")))
    return "Reload the published Terms before accepting.";
  const result = await recordAcceptance(token, display.versionId);
  if (!result.success && result.error.details?.statusCode !== 409)
    return acceptanceFailure(result);
  invalidateUserAuthorizationCache({ userId: before.userId });
  return resumeAfterAcceptance(token, result.success ? scopedDestination(before, display) : undefined, display);
}

function acceptanceFailure(result: import("@/lib/endatix-api").ApiError) {
  toResult(result, {
    logMessage: "Terms acceptance failed",
    loggerName: "legal.acceptance",
  });
  if (result.error.details?.statusCode === 401) redirect("/signin");
  if (result.error.details?.statusCode === 403) redirect("/required-actions");
  return "Could not confirm acceptance. Reload the Terms and try again.";
}

async function recordAcceptance(token: string, versionId: string) {
  const agent = (await headers()).get("user-agent") ?? "";
  return new EndatixApi(token).post(
    "/legal/acceptances",
    { versionId },
    { headers: { "User-Agent": agent } },
  );
}

async function resumeAfterAcceptance(
  token: string,
  accepted: string | undefined,
  display: Journey,
) {
  const after = await termsStanding(token);
  if (!after && accepted) redirect(termsVisit(accepted, confirmedScope(token, accepted)));
  if (!after)
    return "Could not refresh your account status. Reload to continue.";
  if (!pendingTerms(after)) resumeWorkspace(after, {returnUrl: accepted, scope: after.scope});
  redirect(termsVisit(display.returnUrl ?? "/forms", display.scope, "updated"));
}
