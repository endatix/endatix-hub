"use server";

import { cookies } from "next/headers";
import { logoutAction } from "@/features/auth/server";
import { withBasePath } from "@/lib/hosting/base-path";
import { redirect } from "next/navigation";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { signedInToken } from "./terms-standing.server";
import { termsAcceptanceEnabled } from "@/lib/feature-flags/flags";

export async function declineTerms(scope?: string) {
  if (!(await termsAcceptanceEnabled())) redirect("/signout");
  if (workspaceScope(await signedInToken()) !== scope)
    redirect("/accept-terms");
  // Keep the registered federated sign-out callback; the sign-in page shows the operator's contact.
  (await cookies()).set("terms-declined", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: withBasePath("/signin"),
    maxAge: 120,
  });
  await logoutAction();
}
