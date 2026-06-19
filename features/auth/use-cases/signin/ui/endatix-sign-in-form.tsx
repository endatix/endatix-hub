"use client";

import { ErrorMessage } from "@/components/forms/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FC, useActionState } from "react";
import Image from "next/image";
import { AuthPresentation } from "@/features/auth/infrastructure";
import {
  SignInFormState,
  signInWithEndatixAction,
} from "../sign-in-with-endatix.action";
import { Spinner } from "@/components/loaders/spinner";
import { getPublicAssetPath } from "@/lib/hosting";
import Link from "next/link";

import { ServerActionState } from "@/lib/utils/zod-error-utils";

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
        <div className="mb-2 flex justify-center">
          <Image
            src={getPublicAssetPath("/assets/icons/endatix.svg")}
            alt="Endatix logo"
            width={180}
            height={60}
            priority
            className="dark:hidden"
          />
          <Image
            src={getPublicAssetPath("/assets/icons/endatix-white.svg")}
            alt="Endatix logo"
            width={180}
            height={60}
            priority
            className="hidden dark:block"
          />
        </div>
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
