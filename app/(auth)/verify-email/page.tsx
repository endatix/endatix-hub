"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { verifyEmailAction } from "@/features/auth/use-cases/verify-email/verify-email.action";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { getPublicAssetPath } from "@/lib/hosting";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type VerificationState = "loading" | "success" | "error" | "invalid";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerificationState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(10);

  useEffect(() => {
    const verifyEmailToken = async () => {
      if (!token) {
        setState("invalid");
        return;
      }

      try {
        const result = await verifyEmailAction(token);

        if (result.success) {
          setState("success");
          // Start countdown and redirect after 10 seconds
          let timeLeft = 10;
          const countdownInterval = setInterval(() => {
            timeLeft -= 1;
            setCountdown(timeLeft);
            if (timeLeft <= 0) {
              clearInterval(countdownInterval);
              router.push("/signin");
            }
          }, 1000);
        } else {
          setState("error");
          setErrorMessage(result.errorMessage || "Verification failed");
        }
      } catch (error) {
        setState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Verification failed",
        );
      }
    };

    verifyEmailToken();
  }, [token, router]);

  const renderContent = () => {
    switch (state) {
      case "loading":
        return (
          <>
            <div className="grid gap-2 text-center">
              <div className="mb-2 flex items-center justify-center gap-3">
                <Spinner className="h-6 w-6" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  Verifying Your Email
                </h1>
              </div>
              <p className="text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          </>
        );

      case "success":
        return (
          <>
            <div className="grid gap-2 text-center">
              <div className="mb-2 flex items-center justify-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  Email verified successfully!
                </h1>
              </div>
              <p className="text-muted-foreground">
                Your email has been verified. You will be redirected to the sign
                in page in {countdown} seconds.
              </p>
            </div>
            <div className="grid gap-6">
              <Link href="/signin">
                <Button className="w-full">Sign in</Button>
              </Link>
            </div>
          </>
        );

      case "error":
        return (
          <>
            <div className="grid gap-2 text-center">
              <div className="mb-2 flex items-center justify-center gap-3">
                <XCircle className="h-6 w-6 text-red-500" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  Verification failed
                </h1>
              </div>
              <p className="text-destructive">
                {errorMessage ||
                  "We couldn't verify your email address. The link may be invalid or expired."}
              </p>
            </div>
            <div className="grid gap-6">
              <p className="text-sm text-muted-foreground">
                Please check your email for a new verification link or contact
                support if the problem persists.
              </p>
            </div>
          </>
        );

      case "invalid":
        return (
          <>
            <div className="grid gap-2 text-center">
              <div className="mb-2 flex items-center justify-center gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  Invalid Verification Link
                </h1>
              </div>
              <p className="text-muted-foreground">
                This verification link is missing the required token.
              </p>
            </div>
            <div className="grid gap-6">
              <p className="text-sm text-muted-foreground">
                Please check your email for the complete verification link.
              </p>
              <Link href="/signin">
                <Button className="w-full">Sign in</Button>
              </Link>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="mb-2 flex justify-center">
        <Image
          src={getPublicAssetPath("/assets/icons/endatix-logo-wordmark-blue.svg")}
          alt="Endatix Hub"
          width={3778}
          height={706}
          priority
          className="h-10 w-auto dark:hidden"
        />
        <Image
          src={getPublicAssetPath("/assets/icons/endatix-logo-wordmark-white.svg")}
          alt="Endatix Hub"
          width={3778}
          height={706}
          priority
          className="hidden h-10 w-auto dark:block"
        />
      </div>
      {renderContent()}
    </>
  );
}
