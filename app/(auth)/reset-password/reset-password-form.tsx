"use client";

import { useActionState } from "react";
import {
  resetPasswordAction,
  ResetPasswordActionState,
} from "./reset-password.action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import Link from "next/link";
import { ErrorMessage } from "@/components/forms/error-message";
import { ERROR_CODE } from "@/lib/endatix-api";
import FormSuccessMessage from "@/components/forms/form-success-message";

interface ResetPasswordFormProps {
  email: string;
  resetCode: string;
}

import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";

const initialState: ResetPasswordActionState = ServerActionState.emptyState();

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
        defaultValue={state?.data?.email}
        readOnly
      />
      <input
        type="hidden"
        name="resetCode"
        value={resetCode}
        defaultValue={state?.data?.resetCode}
        readOnly
      />

      <div className="grid gap-2 text-center">
        <AuthLogo className="mb-2" />
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
            defaultValue={state?.data?.newPassword}
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
            defaultValue={state?.data?.confirmPassword}
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
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </div>
    </form>
  );
}

export const InvalidResetLinkMessage = () => {
  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone="warning"
        title="This link is invalid or expired"
        description="Password reset links are single-use and short-lived. Request a new one and we will email it to you."
      >
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <Button variant="ghost" asChild className="w-full">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </AuthStatus>
    </>
  );
};

export const ResetPasswordSuccessMessage = () => {
  return (
    <FormSuccessMessage
      title="Password reset successfully!"
      message="Your password has been reset. You can now sign in with your new password."
    >
      <Button asChild className="w-full">
        <Link href="/signin">Go to sign in</Link>
      </Button>
    </FormSuccessMessage>
  );
};
