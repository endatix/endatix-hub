"use client";

import Link from "next/link";

interface SignOutProps {
  readonly name: string;
}
export const generateKeycloakLogoutUrl = (
  redirectUrl: string,
  idToken?: string,
): string => {
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
  return `${AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/logout?${urlParams.toString()}`;
};

export default function SignOutButton({ name }: SignOutProps) {
  console.debug("name", name);

  return (
    <Link
      href={generateKeycloakLogoutUrl(process.env.NEXT_PUBLIC_AUTH_URL ?? "")}
    >
      Sign out
    </Link>
  );
}
