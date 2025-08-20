"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import { sendVerificationAction } from "@/features/auth/use-cases/send-verification/send-verification.action";

export default function AccountVerificationPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string>("");
  const [cooldownSeconds, setCooldownSeconds] = useState(30); // Start with 30 seconds

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(cooldownSeconds - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const handleResendVerification = async () => {
    if (!email || cooldownSeconds > 0) return;

    setIsResending(true);
    setResendMessage("");

    try {
      const result = await sendVerificationAction(email);

      if (result.success) {
        setResendMessage(
          "Verification email sent successfully! Please check your inbox.",
        );
        setCooldownSeconds(30); // Start 30-second cooldown
      } else {
        setResendMessage(
          result.errorMessage || "Failed to send verification email.",
        );
      }
    } catch {
      setResendMessage(
        "An error occurred while sending the verification email.",
      );
    } finally {
      setIsResending(false);
    }
  };

  if (!email) {
    return (
      <>
        <div className="flex justify-center mb-2">
          <Image
            src="/assets/icons/endatix.svg"
            alt="Endatix logo"
            width={180}
            height={60}
            priority
          />
        </div>
        <div className="grid gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Invalid Request
          </h1>
          <p className="text-muted-foreground">
            This page requires a valid email address.
          </p>
        </div>
        <div className="grid gap-4">
          <Button className="w-full" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-center mb-2">
        <Image
          src="/assets/icons/endatix.svg"
          alt="Endatix logo"
          width={180}
          height={60}
          priority
        />
      </div>
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          🎉 Account created successfully!
        </h1>
        <p className="text-muted-foreground">
          We&#39;ve sent a verification email to{" "}
          <span className="font-bold">{email}</span>.
        </p>
      </div>
      <div className="grid gap-8">
        <p className="text-sm text-muted-foreground">
          Please check your inbox and click the link to verify the address and
          activate your account.
        </p>
        {resendMessage && (
          <p
            className={`text-sm ${
              resendMessage.includes("successfully")
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {resendMessage}
          </p>
        )}
        <div className="grid gap-4">
          <p className="text-xs text-muted-foreground">
            Didn&#39;t receive the email? Check your spam folder or request a
            new one.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResendVerification}
            disabled={isResending || cooldownSeconds > 0}
          >
            {isResending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Sending...
              </>
            ) : cooldownSeconds > 0 ? (
              `Resend verification email in ${cooldownSeconds}s`
            ) : (
              "Resend verification email"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
