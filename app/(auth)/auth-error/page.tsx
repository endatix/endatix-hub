import { Button } from "@/components/ui/button";
import { ErrorPage } from "@/components/error-handling/error-page";
import {
  SIGNIN_PATH,
  SIGNOUT_PATH,
} from "@/features/auth/infrastructure/auth-constants";
import { Metadata } from "next";
import Link from "next/link";
import { AuthErrorType } from "@/features/auth/shared/auth.types";
import { auth } from "@/auth";
import {
  resolveErrorPresentation,
  type ErrorPresentation,
} from "@/lib/errors/error-presentation";
import { getPublicAssetPath } from "@/lib/hosting";
import { ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Authentication failed | Endatix Hub",
  description: "Authentication failed the Endatix Hub form management portal.",
  authors: [
    {
      name: "Endatix Team",
      url: "https://endatix.com",
    },
  ],
  openGraph: {
    description:
      "Authentication failed the Endatix Hub form management portal.",
    images: [
      {
        url: getPublicAssetPath("/assets/endatix-og-image.jpg"),
      },
    ],
  },
  robots: ROBOTS.hiddenPage,
};

interface AuthErrorPresentation extends ErrorPresentation {
  /** Branch name shown to the user to quote at support. Not the HTTP status. */
  supportCode: string;
}

const UNKNOWN_PRESENTATION: AuthErrorPresentation = {
  code: "500",
  eyebrow: "Authentication failed",
  title: "We couldn't sign you in.",
  message:
    "There was a problem when trying to authenticate. Please contact us if this error persists.",
  supportCode: "Unknown",
};

const errorMap: Record<AuthErrorType, AuthErrorPresentation> = {
  [AuthErrorType.Configuration]: {
    code: "500",
    eyebrow: "Authentication failed",
    title: "We couldn't sign you in.",
    message:
      "There was a problem when trying to authenticate. Please contact us if this error persists.",
    supportCode: "Configuration",
  },
  [AuthErrorType.Network]: {
    code: "503",
    eyebrow: "Connection problem",
    title: "We couldn't reach the Endatix API.",
    message:
      "The service did not respond. Try again in a moment, and contact us if the problem persists.",
    supportCode: "Network",
  },
  [AuthErrorType.Server]: {
    code: "500",
    eyebrow: "Authentication failed",
    title: "We couldn't sign you in.",
    message:
      "There was an unexpected error when trying to authenticate. Please try again and contact us if the issue persists.",
    supportCode: "Server",
  },
  [AuthErrorType.InvalidToken]: {
    code: "401",
    eyebrow: "Authorization failed",
    title: "Your session was rejected.",
    message:
      "You are signed in, but the authorization server rejected your session. Sign out and sign in again, and contact us if the issue persists.",
    supportCode: "InvalidToken",
  },
  [AuthErrorType.Unknown]: UNKNOWN_PRESENTATION,
};

interface AuthErrorPageProps {
  searchParams: Promise<{
    error: string | undefined;
  }>;
}

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { error } = await searchParams;
  const session = await auth();
  const isLoggedIn = !!session;

  const presentation = resolveErrorPresentation(
    errorMap,
    error,
    UNKNOWN_PRESENTATION,
  );

  const hasInvalidTokenError =
    isLoggedIn && error === AuthErrorType.InvalidToken;

  // A rejected token while signed out just means the session lapsed. "Your session
  // was rejected" would overstate it, so fall back to the generic sign-in copy and
  // keep only the support code that says which branch it was.
  const resolved =
    error === AuthErrorType.InvalidToken && !hasInvalidTokenError
      ? { ...UNKNOWN_PRESENTATION, supportCode: presentation.supportCode }
      : presentation;

  return (
    <ErrorPage {...resolved}>
      {hasInvalidTokenError ? (
        <Button variant="default" asChild>
          <Link href={SIGNOUT_PATH}>Sign out</Link>
        </Button>
      ) : (
        <Button variant="default" asChild>
          <Link href={SIGNIN_PATH}>Go to sign in</Link>
        </Button>
      )}
      <p className="text-xs text-on-surface-variant">
        Error code{" "}
        <code className="rounded-sm bg-surface-container px-1.5 py-0.5 font-mono">
          {resolved.supportCode}
        </code>
      </p>
    </ErrorPage>
  );
}
