"use client";

import Link from "next/link";
import { UrlObject } from "url";

interface SignOutProps {
  readonly name: string;
}
export const generateKeycloakLogoutUrl = (
  redirectUrl: string,
  idToken?: string,
): UrlObject => {
  const CLIENT_ID = process.env.NEXT_PUBLIC_AUTH_KEYCLOAK_ID ?? "";
  const AUTH_KEYCLOAK_ISSUER =
    process.env.NEXT_PUBLIC_AUTH_KEYCLOAK_ISSUER ?? "";
  const urlParams = new URLSearchParams();
  urlParams.append("client_id", CLIENT_ID);
  urlParams.append(
    "post_logout_redirect_uri",
    `${redirectUrl}/api/auth/logout`,
  );
  if (idToken) {
    urlParams.append("id_token_hint", idToken);
  }

  return {
    pathname: `${AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout`,
    query: Object.fromEntries(urlParams.entries()),
  };
};

export default function KeycloakSignOutButton({ name }: SignOutProps) {
  console.debug("name", name);

  return (
    <Link
      href={generateKeycloakLogoutUrl(process.env.NEXT_PUBLIC_AUTH_URL ?? "")}
    >
      Sign out
    </Link>
  );
}
