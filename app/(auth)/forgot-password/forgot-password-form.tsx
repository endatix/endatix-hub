"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./forgot-password.action";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import Link from "next/link";
import { ErrorMessage } from "@/components/forms/error-message";
import { getPublicAssetPath } from "@/lib/hosting";
import { CircleCheckBig } from "lucide-react";

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
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-center gap-3">
        <CircleCheckBig className="h-8 w-8 text-green-500" />
        <h2 className="text-2xl font-semibold">Reset password link sent</h2>
      </div>
      <p className="text-center text-muted-foreground">
        If your email is correct, you will receive a link to reset your
        password.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        If you don&apos;t see the email, check your spam folder.
      </p>
    </div>
  );
}
