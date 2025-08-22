"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "./reset-password.action";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import Link from "next/link";
import { ErrorMessage } from "@/components/forms/error-message";
import { CalendarX2, CircleCheckBig } from "lucide-react";
import { ERROR_CODE } from "@/lib/endatix-api";

interface ResetPasswordFormProps {
  email: string;
  resetCode: string;
}

const initialState = {
  isSuccess: false,
};

export default function ResetPasswordForm({
  email,
  resetCode,
}: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  if (!email || !resetCode) {
    return <InvalidResetLinkMessage />;
  }

  if (state?.isSuccess) {
    return <ResetPasswordSuccessMessage />;
  }

  if (state?.errorCode === ERROR_CODE.INVALID_TOKEN) {
    return <InvalidResetLinkMessage />;
  }

  return (
    <form action={formAction} autoComplete="on">
      <input
        type="hidden"
        name="email"
        value={email}
        autoComplete="email"
        defaultValue={state?.values?.email}
        readOnly
      />
      <input
        type="hidden"
        name="resetCode"
        value={resetCode}
        defaultValue={state?.values?.resetCode}
        readOnly
      />

      <div className="grid gap-2 text-center">
        <div className="flex justify-center mb-2">
          <Image
            src="/assets/icons/endatix.svg"
            alt="Endatix logo"
            width={180}
            height={60}
            priority
          />
        </div>
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="mb-6 text-balance text-muted-foreground">
          Enter your new password below.
        </p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            name="newPassword"
            required
            placeholder="Enter your new password"
            tabIndex={3}
            autoFocus
            defaultValue={state?.values?.newPassword}
            autoComplete="new-password"
          />
          {state?.errors?.newPassword && (
            <ErrorMessage message={state.errors.newPassword} />
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            required
            placeholder="Confirm your new password"
            tabIndex={4}
            defaultValue={state?.values?.confirmPassword}
            autoComplete="new-password"
          />
          {state?.errors?.confirmPassword && (
            <ErrorMessage message={state.errors.confirmPassword} />
          )}
        </div>
        {state?.formErrors && <ErrorMessage message={state.formErrors} />}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          tabIndex={5}
        >
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          Reset password
        </Button>
        <Button variant="secondary" className="w-full" tabIndex={6} asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </form>
  );
}

export const InvalidResetLinkMessage = () => {
  return (
    <div className="grid gap-2 text-center">
      <div className="flex justify-center mb-2">
        <Image
          src="/assets/icons/endatix.svg"
          alt="Endatix logo"
          width={180}
          height={60}
          priority
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <CalendarX2 className="w-8 h-8 text-red-500" />
          <h2 className="text-2xl font-semibold">Invalid reset link</h2>
        </div>
        <p className="text-muted-foreground text-center">
          This password reset link is invalid or has expired. Please request a
          new password reset link.
        </p>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request new reset link</Link>
        </Button>
      </div>
    </div>
  );
};

export const ResetPasswordSuccessMessage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3 mb-2">
        <CircleCheckBig className="w-8 h-8 text-green-500" />
        <h2 className="text-2xl font-semibold">Password reset successfully!</h2>
      </div>
      <p className="text-muted-foreground text-center">
        Your password has been reset. You can now log in with your new password.
      </p>
      <Button asChild className="w-full">
        <Link href="/login">Go to sign in</Link>
      </Button>
    </div>
  );
};
