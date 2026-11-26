"use server";

import { cookies } from "next/headers";
import { logoutAction } from "@/features/auth/server";
import { withBasePath } from "@/lib/hosting/base-path";

export async function declineTerms() {
  // Keep the registered federated sign-out callback; the sign-in page shows the operator's contact.
  (await cookies()).set("terms-declined", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: withBasePath("/signin"),
    maxAge: 120,
  });
  await logoutAction();
}
