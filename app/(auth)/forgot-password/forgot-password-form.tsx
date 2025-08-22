"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "./forgot-password.action";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/loaders/spinner";
import Link from "next/link";
import { ErrorMessage } from "@/components/forms/error-message";
import { CircleCheckBig } from "lucide-react";

export default function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    null,
  );

  if (state?.isSuccess) {
    return <ForgotPasswordSuccessMessage />;
  }

  return (
    <form action={formAction}>
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
            defaultValue={state?.values?.email}
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
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    </form>
  );
}

function ForgotPasswordSuccessMessage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3 mb-2">
        <CircleCheckBig className="w-8 h-8 text-green-500" />
        <h2 className="text-2xl font-semibold">Reset password link sent</h2>
      </div>
      <p className="text-muted-foreground text-center">
        If your email is correct, you will receive a link to reset your
        password.
      </p>
      <p className="text-sm text-muted-foreground text-center">
        If you don&apos;t see the email, check your spam folder.
      </p>
    </div>
  );
}
