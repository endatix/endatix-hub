"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";
import { verifyEmailAction } from "@/features/auth/use-cases/verify-email/verify-email.action";

const REDIRECT_SECONDS = 10;

/**
 * A used token is not a failure — it means the address is already verified, so
 * the only thing left to do is sign in. An expired one is recoverable but needs
 * a fresh link. Everything else is a genuine error.
 */
type VerificationState =
  | "loading"
  | "verified"
  | "alreadyVerified"
  | "expired"
  | "failed"
  | "missingToken";

function classifyFailure(message: string | undefined): VerificationState {
  if (message && /already been used/i.test(message)) {
    return "alreadyVerified";
  }

  if (message && /expired/i.test(message)) {
    return "expired";
  }

  return "failed";
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerificationState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(REDIRECT_SECONDS);

  useEffect(() => {
    if (!token) {
      setState("missingToken");
      return;
    }

    let cancelled = false;

    const verifyEmailToken = async () => {
      try {
        const result = await verifyEmailAction(token);
        if (cancelled) {
          return;
        }

        if (result.success) {
          setState("verified");
          return;
        }

        setState(classifyFailure(result.errorMessage));
        setErrorMessage(result.errorMessage ?? "");
      } catch {
        if (!cancelled) {
          setState("failed");
        }
      }
    };

    verifyEmailToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Only the freshly verified path bounces to sign-in; the other states are
  // waiting on the reader, so moving the page under them would lose the message.
  useEffect(() => {
    if (state !== "verified") {
      return;
    }

    if (countdown <= 0) {
      router.push("/signin");
      return;
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [state, countdown, router]);

  return (
    <>
      <AuthLogo className="mb-2" />
      {renderState()}
    </>
  );

  function renderState() {
    switch (state) {
      case "loading":
        return (
          <AuthStatus
            tone="pending"
            title="Verifying your email"
            description="This only takes a moment."
          />
        );

      case "verified":
        return (
          <AuthStatus
            tone="success"
            title="Email verified"
            description={`Your account is active. Taking you to sign in in ${countdown}s.`}
          >
            <Button asChild className="w-full">
              <Link href="/signin">Sign in now</Link>
            </Button>
          </AuthStatus>
        );

      case "alreadyVerified":
        return (
          <AuthStatus
            tone="success"
            title="Already verified"
            description="This link has been used before. Your email address is confirmed, so you can sign in."
          >
            <Button asChild className="w-full">
              <Link href="/signin">Go to sign in</Link>
            </Button>
          </AuthStatus>
        );

      case "expired":
        return (
          <AuthStatus
            tone="warning"
            title="This link has expired"
            description="Verification links are short-lived. Sign in and we will send you a new one."
          >
            <Button asChild className="w-full">
              <Link href="/signin">Go to sign in</Link>
            </Button>
          </AuthStatus>
        );

      case "missingToken":
        return (
          <AuthStatus
            tone="warning"
            title="This link is incomplete"
            description="The verification link is missing its token. Open the most recent link from your inbox."
          >
            <Button asChild className="w-full">
              <Link href="/signin">Go to sign in</Link>
            </Button>
          </AuthStatus>
        );

      default:
        return (
          <AuthStatus
            tone="error"
            title="We couldn't verify your email"
            description={
              errorMessage ||
              "The link may be invalid. Open the most recent link from your inbox, or request a new one."
            }
          >
            <Button asChild className="w-full">
              <Link href="/signin">Go to sign in</Link>
            </Button>
          </AuthStatus>
        );
    }
  }
}
