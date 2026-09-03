"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";
import { sendVerificationAction } from "@/features/auth/use-cases/send-verification/send-verification.action";
import { CircleCheckBig, CircleX } from "lucide-react";

/** Matches the window the API enforces between two verification emails. */
const RESEND_COOLDOWN_SECONDS = 30;

type ResendResult = { tone: "success" | "error"; message: string };

export default function AccountVerificationPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);
  const [resendResult, setResendResult] = useState<ResendResult | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(
    RESEND_COOLDOWN_SECONDS,
  );

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setTimeout(
      () => setCooldownSeconds(cooldownSeconds - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldownSeconds]);

  const handleResendVerification = async () => {
    if (!email || cooldownSeconds > 0) {
      return;
    }

    setIsResending(true);
    setResendResult(null);

    try {
      const result = await sendVerificationAction(email);

      // Carry the outcome as a tone, not a string the renderer greps for a
      // keyword: a failure that happened to contain "successfully" rendered green.
      if (result.success) {
        setResendResult({
          tone: "success",
          message: "Verification email sent. Please check your inbox.",
        });
        setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      } else {
        setResendResult({
          tone: "error",
          message:
            result.errorMessage ?? "We could not send the verification email.",
        });
      }
    } catch {
      setResendResult({
        tone: "error",
        message: "We could not send the verification email.",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <>
        <AuthLogo className="mb-2" />
        <AuthStatus
          tone="warning"
          title="This link is incomplete"
          description="Open the link from your confirmation email, or sign in to continue."
        >
          <Button asChild className="w-full">
            <Link href="/signin">Go to sign in</Link>
          </Button>
        </AuthStatus>
      </>
    );
  }

  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone="success"
        title="Check your inbox"
        description={
          <>
            If <span className="font-medium text-foreground">{email}</span> can
            be registered, we have sent it a link to verify the address and
            activate the account.
          </>
        }
      >
        {resendResult ? (
          <Alert
            variant={
              resendResult.tone === "success" ? "success" : "destructive"
            }
            className="text-left"
          >
            {resendResult.tone === "success" ? <CircleCheckBig /> : <CircleX />}
            <AlertDescription>{resendResult.message}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleResendVerification}
          disabled={isResending || cooldownSeconds > 0}
        >
          {isResending && <Spinner className="mr-2 size-4" />}
          {resendButtonLabel(isResending, cooldownSeconds)}
        </Button>

        <p className="text-sm text-muted-foreground">
          No email yet? Check your spam folder before requesting another.
        </p>

        <Button variant="ghost" asChild className="w-full">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </AuthStatus>
    </>
  );
}

function resendButtonLabel(isResending: boolean, cooldownSeconds: number) {
  if (isResending) {
    return "Sending...";
  }

  return cooldownSeconds > 0
    ? `Resend email in ${cooldownSeconds}s`
    : "Resend verification email";
}
