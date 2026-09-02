"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./forgot-password.action";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import Link from "next/link";
import { ErrorMessage } from "@/components/forms/error-message";
import { CircleCheckBig } from "lucide-react";
import { AuthLogo } from "@/features/auth/ui/auth-logo";
import { AuthStatus } from "@/features/auth/ui/auth-status";

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    ServerActionState.emptyState(),
  );

  if (state?.isSuccess) {
    return <ForgotPasswordSuccessMessage />;
  }

  return (
    <form action={formAction}>
      <div className="grid gap-2 text-center">
        <AuthLogo className="mb-2" />
        <p className="mb-6 text-balance text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            required
            autoFocus
            tabIndex={1}
            defaultValue={state?.data?.email}
          />
          {state?.errors?.email && (
            <ErrorMessage message={state.errors.email.toString()} />
          )}
        </div>
        {state?.formErrors && <ErrorMessage message={state.formErrors} />}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          tabIndex={3}
        >
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          Reset password
        </Button>
        <Button variant="secondary" className="w-full" tabIndex={3} asChild>
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </div>
    </form>
  );
}

function ForgotPasswordSuccessMessage() {
  return (
    <>
      <AuthLogo className="mb-2" />
      <AuthStatus
        tone="success"
        title="Check your inbox"
        description="If that email address has an account, we have sent it a link to reset the password."
      >
        <p className="text-sm text-muted-foreground">
          No email yet? Check your spam folder.
        </p>
        <Button variant="ghost" asChild className="w-full">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </AuthStatus>
    </>
  );
}
