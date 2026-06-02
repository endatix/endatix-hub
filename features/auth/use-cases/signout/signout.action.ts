"use server";

import { signOut } from "@/auth";
import { getAuthJwtFromRequest } from "../../infrastructure/auth-jwt.utils";
import { resolveFederatedLogoutUrl } from "../../infrastructure/auth-logout.utils";
import { SIGNIN_PATH } from "../../infrastructure/auth-constants";
import { withBasePath } from "@/lib/hosting/base-path";
import { redirect } from "next/navigation";

type ExternalRedirectUrl = `${string}:${string}`;
type InternalRedirectUrl = Parameters<typeof redirect>[0];

/**
 * Signs out the user and redirects to the federated logout URL if available, otherwise redirects to the signin page.
 */
export async function logoutAction() {
  const token = await getAuthJwtFromRequest();

  await signOut({ redirect: false });

  let federatedLogoutUrl: string | null = null;
  try {
    federatedLogoutUrl = resolveFederatedLogoutUrl(token);
  } catch (error) {
    console.warn("Failed to resolve federated logout URL", error);
  }

  if (federatedLogoutUrl) {
    redirect(federatedLogoutUrl as ExternalRedirectUrl);
  }

  redirect(
    withBasePath(
      SIGNIN_PATH,
      process.env.NEXT_PUBLIC_BASE_PATH,
    ) as InternalRedirectUrl,
  );
}
