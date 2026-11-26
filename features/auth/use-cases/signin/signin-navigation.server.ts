import "server-only";
import { readAuthPublicUrl } from "@/features/auth/infrastructure/session-utils";

/** Pass only the sign-in intent and the configured public origin to the provider buttons. */
export function signinNavigation({ returnUrl, callbackUrl }: { returnUrl?: string; callbackUrl?: string }) {
  return { returnUrl, callbackUrl, publicOrigin: configuredOrigin() };
}

function configuredOrigin() {
  const configured = readAuthPublicUrl();
  if (!configured) return undefined;
  const url = URL.parse(configured);
  // Only a missing setting allows the browser to supply its origin.
  return url && ["http:", "https:"].includes(url.protocol) ? url.origin : "";
}
