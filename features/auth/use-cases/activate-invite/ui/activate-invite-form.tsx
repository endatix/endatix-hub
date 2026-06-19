"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarX2 } from "lucide-react";
import {
  type ComponentProps,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ZodError } from "zod";
import { ErrorMessage } from "@/components/forms/error-message";
import FormSuccessMessage from "@/components/forms/form-success-message";
import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { ActivateInviteRequestSchema } from "@/lib/endatix-api/types";
import { ServerActionState } from "@/lib/utils/zod-error-utils";
import {
  activateInviteAction,
  type ActivateInviteActionState,
} from "../activate-invite.action";
import { getStringFormValue } from "@/lib/utils/form-data-utils";
import { getPublicAssetPath } from "@/lib/hosting";

interface ActivateInviteFormProps {
  token: string;
  email: string;
}

const initialState: ActivateInviteActionState = ServerActionState.emptyState();

type ActivateInviteClientErrors = {
  password?: string[];
  confirmPassword?: string[];
};

type FormSubmitHandler = NonNullable<ComponentProps<"form">["onSubmit"]>;

export default function ActivateInviteForm({
  token,
  email,
}: Readonly<ActivateInviteFormProps>) {
  const [state, formAction, isPending] = useActionState(
    activateInviteAction,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<ActivateInviteClientErrors>(
    {},
  );
  const hasTrackedActivation = useRef(false);
  const { trackEvent } = useTrackEvent();

  useEffect(() => {
    if (!state.isSuccess || hasTrackedActivation.current) {
      return;
    }

    hasTrackedActivation.current = true;
    trackEvent("auth_invite_activated", {
      success: true,
    });
  }, [state.isSuccess, trackEvent]);

  if (!token) {
    return <InvalidInviteLinkMessage />;
  }

  if (state.isSuccess) {
    return <ActivateInviteSuccessMessage email={state.email} />;
  }

  const passwordErrors = clientErrors.password ?? state.errors?.password;
  const confirmPasswordErrors =
    clientErrors.confirmPassword ?? state.errors?.confirmPassword;

  const handleSubmit: FormSubmitHandler = (event) => {
    const formData = new FormData(event.currentTarget);
    const validationResult = ActivateInviteRequestSchema.safeParse({
      token,
      password: getStringFormValue(formData, "password"),
      confirmPassword: getStringFormValue(formData, "confirmPassword"),
    });

    if (validationResult.success) {
      setClientErrors({});
      return;
    }

    event.preventDefault();
    setClientErrors(mapClientValidationErrors(validationResult.error));
  };

  return (
    <form action={formAction} autoComplete="on" onSubmit={handleSubmit}>
      <input type="hidden" name="token" value={token} readOnly />

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
        <h1 className="text-2xl font-semibold">Accept your invitation</h1>
        <p className="mb-6 text-balance text-muted-foreground">
          Set a password to activate your account and sign in to Endatix Hub.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={email}
            autoComplete="username"
            readOnly
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            required
            placeholder="Enter your password"
            autoComplete="new-password"
            minLength={8}
            autoFocus
            onChange={() => setClientErrors({})}
          />
          {passwordErrors && <ErrorMessage message={passwordErrors} />}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            required
            placeholder="Confirm your password"
            autoComplete="new-password"
            minLength={8}
            onChange={() => setClientErrors({})}
          />
          {confirmPasswordErrors && (
            <ErrorMessage message={confirmPasswordErrors} />
          )}
        </div>

        {state.formErrors && <ErrorMessage message={state.formErrors} />}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          Activate account
        </Button>

        <Button variant="secondary" className="w-full" asChild>
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </div>
    </form>
  );
}

function mapClientValidationErrors(
  error: ZodError,
): ActivateInviteClientErrors {
  const errors: ActivateInviteClientErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field !== "password" && field !== "confirmPassword") {
      continue;
    }

    errors[field] ??= [];
    errors[field].push(issue.message);
  }

  return errors;
}

export const InvalidInviteLinkMessage = () => {
  return (
    <div className="grid gap-2 text-center">
      <div className="mb-2 flex justify-center">
        <Image
          src="/assets/icons/endatix.svg"
          alt="Endatix logo"
          width={180}
          height={60}
          priority
        />
      </div>
      <div className="space-y-4">
        <div className="mb-2 flex items-center justify-center gap-3">
          <CalendarX2 className="h-8 w-8 text-red-500" />
          <h2 className="text-2xl font-semibold">Invalid invite link</h2>
        </div>
        <p className="text-center text-muted-foreground">
          This invitation link is invalid or has expired. Ask an administrator
          to resend your invitation.
        </p>
        <Button asChild className="w-full">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </div>
    </div>
  );
};

interface ActivateInviteSuccessMessageProps {
  email?: string;
}

export const ActivateInviteSuccessMessage = ({
  email,
}: Readonly<ActivateInviteSuccessMessageProps>) => {
  return (
    <FormSuccessMessage
      title="Invitation accepted"
      message={
        email
          ? `Your account for ${email} is active. You can now sign in with your password.`
          : "Your account is active. You can now sign in with your password."
      }
    >
      <Button asChild className="w-full">
        <Link href="/signin">Go to sign in</Link>
      </Button>
    </FormSuccessMessage>
  );
};
