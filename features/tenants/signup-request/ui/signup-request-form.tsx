"use client";

import { ErrorMessage } from "@/components/forms/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/loaders/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import {
  firstFieldError,
  ServerActionState,
} from "@/lib/utils/zod-error-utils";
import {
  submitSignupRequestAction,
  type SignupRequestActionState,
} from "../submit-signup-request.action";
import { getPublicAssetPath } from "@/lib/hosting";

const initialState: SignupRequestActionState = ServerActionState.emptyState();

export function SignupRequestForm() {
  const [state, formAction, isPending] = useActionState(
    submitSignupRequestAction,
    initialState,
  );
  const posthog = usePostHog();
  const pendingAnalytics = useRef<{ email: string; hasCompany: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!state.isSuccess || !pendingAnalytics.current || !posthog) {
      return;
    }

    const { email, hasCompany } = pendingAnalytics.current;
    pendingAnalytics.current = null;
    posthog.setPersonProperties({ email });
    posthog.capture("signup_requested", { has_company: hasCompany });
  }, [posthog, state.isSuccess]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const email = formValue(form, "email");
    pendingAnalytics.current = {
      email,
      hasCompany: formValue(form, "companyName").length > 0,
    };

    const distinctId = form.elements.namedItem("postHogDistinctId");
    const sessionId = form.elements.namedItem("postHogSessionId");
    if (
      distinctId instanceof HTMLInputElement &&
      sessionId instanceof HTMLInputElement &&
      posthog
    ) {
      distinctId.value = posthog.get_distinct_id();
      sessionId.value = posthog.get_session_id();
    }
  }

  if (state.isSuccess) {
    return (
      <Card className="gap-2 bg-background">
        <CardHeader className="pb-3">
          <CardTitle>Request received</CardTitle>
          <CardDescription className="max-w-lg leading-relaxed text-balance">
            {state.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="underline underline-offset-4">
              Sign in
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <div className="grid gap-2 text-center">
        <div className="mb-2 flex justify-center">
          <Image
            src={getPublicAssetPath(
              "/assets/icons/endatix-logo-wordmark-blue.svg",
            )}
            alt="Endatix Hub"
            width={3778}
            height={706}
            priority
            className="h-10 w-auto dark:hidden"
          />
          <Image
            src={getPublicAssetPath(
              "/assets/icons/endatix-logo-wordmark-white.svg",
            )}
            alt="Endatix Hub"
            width={3778}
            height={706}
            priority
            className="hidden h-10 w-auto dark:block"
          />
        </div>
        <p className="mb-6 text-balance text-muted-foreground">
          Request access to an Endatix workspace. We will review your request
          and email you if approved.
        </p>
      </div>
      <div className="grid gap-4">
        <div
          className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <input type="hidden" name="postHogDistinctId" defaultValue="" />
        <input type="hidden" name="postHogSessionId" defaultValue="" />
        <div className="grid gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            defaultValue={state.data?.email}
            required
            autoFocus
          />
          <ErrorMessage message={firstFieldError(state.errors, "email")} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="companyName">Company (optional)</Label>
          <Input
            id="companyName"
            type="text"
            name="companyName"
            defaultValue={state.data?.companyName}
          />
          <ErrorMessage
            message={firstFieldError(state.errors, "companyName")}
          />
        </div>
        {state.isSuccess === false ? (
          <ErrorMessage message={state.message ?? state.formErrors} />
        ) : null}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Request workspace
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}

function formValue(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value.trim() : "";
}
