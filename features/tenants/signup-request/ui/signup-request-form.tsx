'use client';

import { ErrorMessage } from '@/components/forms/error-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/loaders/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Result } from '@/lib/result';
import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { submitSignupRequestAction } from '../submit-signup-request.action';
import { getPublicAssetPath } from '@/lib/hosting';

type SignupFormState =
  | { success: false; errorMessage?: string }
  | { success: true; message: string };

const initialState: SignupFormState = { success: false };

export function SignupRequestForm() {
  const [state, formAction, isPending] = useActionState(
    async (_: SignupFormState, formData: FormData): Promise<SignupFormState> => {
      const result = await submitSignupRequestAction(formData);
      if (Result.isError(result)) {
        return { success: false, errorMessage: result.message };
      }

      return { success: true, message: result.value.message };
    },
    initialState,
  );

  if (state.success) {
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
            Already have an account?{' '}
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
    <form action={formAction}>
      <div className="grid gap-2 text-center">
        <div className="mb-2 flex justify-center">
          <Image
            src={getPublicAssetPath('/assets/icons/endatix-logo-wordmark-blue.svg')}
            alt="Endatix Hub"
            width={3778}
            height={706}
            priority
            className="h-10 w-auto dark:hidden"
          />
          <Image
            src={getPublicAssetPath('/assets/icons/endatix-logo-wordmark-white.svg')}
            alt="Endatix Hub"
            width={3778}
            height={706}
            priority
            className="hidden h-10 w-auto dark:block"
          />
        </div>
        <p className="mb-6 text-balance text-muted-foreground">
          Request access to an Endatix workspace. We will review your request and
          email you if approved.
        </p>
      </div>
      <div className="grid gap-4">
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            required
            autoFocus
            tabIndex={1}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="companyName">Company (optional)</Label>
          <Input
            id="companyName"
            type="text"
            name="companyName"
            tabIndex={2}
          />
        </div>
        {state.errorMessage ? <ErrorMessage message={state.errorMessage} /> : null}
        <Button type="submit" className="w-full" disabled={isPending} tabIndex={3}>
          {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Request workspace
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/signin" className="underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
