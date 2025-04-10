"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { useActionState } from "react";
import { loginAction } from "../login.action";
import { showComingSoonMessage } from "@/components/layout-ui/teasers/coming-soon-link";
import { Spinner } from "@/components/loaders/spinner";
import { ErrorMessage } from "@/components/forms/error-message";

const LoginForm = () => {
  const [state, formAction, isPending] = useActionState(loginAction, null);

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
            required
            autoFocus
            tabIndex={1}
          />
        </div>
        {state?.errors?.email && (
          <ErrorMessage message={state.errors.email.toString()} />
        )}
        <div className="grid gap-2">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              href="#"
              onClick={() => showComingSoonMessage()}
              className="ml-auto inline-block text-sm underline"
              tabIndex={4}
            >
              Forgot your password?
            </Link>
          </div>
          <Input id="password" type="password" name="password" required tabIndex={2} />
        </div>
        {state?.errors?.password && (
          <ErrorMessage message={`Password must ${state.errors.password}`} />
        )}
        <Button type="submit" className="w-full" disabled={isPending} tabIndex={3}>
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          Sign in with email
        </Button>
      </div>
      {state?.errorMessage && <ErrorMessage message={state.errorMessage} />}
    </form>
  );
};

export default LoginForm;
