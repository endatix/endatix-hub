"use client";

// import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
// import { Spinner } from "@/components/loaders/spinner";
import { ErrorMessage } from "@/components/forms/error-message";
import { createAccountAction } from "../create-account.action";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { getPublicAssetPath } from "@/lib/hosting";

interface CreateAccountActionState {
  success: boolean;
  errors?: {
    email?: string[];
    password?: string[];
  };
  errorMessage?: string;
  formData?: FormData;
}

const CreateAccountForm = () => {
  const router = useRouter();
  const [state, formAction, _] = useActionState<
    CreateAccountActionState,
    FormData
  >(
    async (_, formData) => {
      const result = await createAccountAction(null, formData);
      if (result.success) {
        const email = formData.get("email");
        if (email) {
          router.push(
            `/account-verification?email=${encodeURIComponent(email.toString())}`,
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
          Collect data with highly customizable forms in minutes
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
            defaultValue={state?.formData?.get("email")?.toString()}
          />
          {state?.errors?.email && (
            <ErrorMessage message={state.errors.email.toString()} />
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            name="password"
            required
            tabIndex={2}
            defaultValue={state?.formData?.get("password")?.toString()}
          />
          {state?.errors?.password && (
            <ErrorMessage message={state.errors.password.toString()} />
          )}
        </div>
        {state?.errorMessage && <ErrorMessage message={state.errorMessage} />}
        {/* <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Spinner className="mr-2" /> : null}
          Create account with email
        </Button> */}
      </div>
    </form>
  );
};

export default CreateAccountForm;
