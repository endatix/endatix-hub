"use client";

import { ErrorMessage } from "@/components/forms/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FC, useActionState } from "react";
import { AuthPresentation } from "@/features/auth/infrastructure";
import {
  SignInFormState,
  signInWithEndatixAction,
} from "../sign-in-with-endatix.action";
import { Spinner } from "@/components/loaders/spinner";
import Link from "next/link";

import { ServerActionState } from "@/lib/utils/zod-error-utils";
import { AuthLogo } from "@/features/auth/ui/auth-logo";

interface EndatixSignInFormProps {
  endatixAuthProvider: AuthPresentation;
  returnUrl: string;
}

const EndatixSignInForm: FC<EndatixSignInFormProps> = ({
  endatixAuthProvider,
  returnUrl,
}) => {
  const initialState: SignInFormState = ServerActionState.emptyState({
    returnUrl,
  });

  const [state, formAction, isPending] = useActionState(
    signInWithEndatixAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="returnUrl" value={returnUrl} readOnly />
      <div className="grid gap-2 text-center">
        <AuthLogo className="mb-2" />
        <p className="mb-6 text-balance text-muted-foreground">
          Sign in to your account
        </p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Email address"
            required
            autoFocus
            tabIndex={1}
            defaultValue={state?.data?.email}
          />
          {state?.errors?.email && (
            <ErrorMessage message={state?.errors?.email} />
          )}
        </div>
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="ml-auto inline-block text-sm underline"
              tabIndex={4}
            >
              Forgot your password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            tabIndex={2}
            defaultValue={state?.data?.password}
          />
          {state?.errors?.password && (
            <ErrorMessage message={state?.errors?.password} />
          )}
        </div>
        {state?.formErrors && <ErrorMessage message={state?.formErrors} />}
        <Button
          type="submit"
          className="w-full"
          disabled={isPending}
          tabIndex={3}
        >
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          {endatixAuthProvider.signInLabel}
        </Button>
      </div>
    </form>
  );
};

export default EndatixSignInForm;
