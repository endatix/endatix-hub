"use client";

import { ErrorMessage } from "@/components/forms/error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/loaders/spinner";
import { registerTenantAccountAction } from "../public-tenant.action";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { AuthLogo } from "@/features/auth/ui/auth-logo";

interface TenantRegisterFormProps {
  shortUrl: string;
  tenantName: string;
}

function formString(formData: FormData | undefined, name: string): string {
  const value = formData?.get(name);
  return typeof value === "string" ? value : "";
}

const TenantRegisterForm = ({
  shortUrl,
  tenantName,
}: TenantRegisterFormProps) => {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await registerTenantAccountAction(
        shortUrl,
        null,
        formData,
      );
      if (result.success) {
        const email = formString(formData, "email");
        if (email) {
          router.push(
            `/account-verification?email=${encodeURIComponent(email)}`,
          );
        }
      }

      return result;
    },
    { success: false },
  );

  return (
    <form action={formAction}>
      <div className="grid gap-2 text-center">
        <AuthLogo className="mb-2" />
        <p className="mb-6 text-balance text-muted-foreground">
          Create an account for {tenantName}
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
            defaultValue={formString(state?.formData, "email")}
          />
          {state?.errors?.email && (
            <ErrorMessage message={state.errors.email.toString()} />
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" name="password" required />
          {state?.errors?.password && (
            <ErrorMessage message={state.errors.password.toString()} />
          )}
        </div>
        {state?.errorMessage && <ErrorMessage message={state.errorMessage} />}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Create account
        </Button>
      </div>
    </form>
  );
};

export default TenantRegisterForm;
