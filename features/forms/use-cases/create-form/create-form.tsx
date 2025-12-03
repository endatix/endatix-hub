"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  createFormAction,
  type CreateFormActionState,
} from "./create-form.action";
import { ErrorMessage } from "@/components/forms/error-message";
import { Spinner } from "@/components/loaders/spinner";
import FormSuccessMessage from "@/components/forms/form-success-message";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

const INITIAL_STATE: CreateFormActionState = {
  isSuccess: false,
};

export default function CreateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createFormAction,
    INITIAL_STATE,
  );
  const isFormCreatedState = state?.isSuccess && state?.formId;

  useEffect(() => {
    if (isFormCreatedState) {
      toast.success({
        title: "Form created successfully!",
        description: "Opening form designer...",
      });
      setTimeout(() => {
        router.push(`/forms/${state?.formId}/design`);
      }, 400);
    }
  }, [isFormCreatedState, router, state?.formId]);

  return (
    <form action={formAction} className="space-y-6">
      {state?.formErrors && state.formErrors.length > 0 && (
        <div className="rounded-md bg-destructive/15 p-4">
          <ErrorMessage message={state.formErrors} />
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Enter form's name"
            defaultValue={state?.values?.name}
            required
            disabled={isPending}
          />
          {state?.errors?.name && <ErrorMessage message={state.errors.name} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Enter form's description"
            defaultValue={state?.values?.description}
            rows={3}
            disabled={isPending}
          />
        </div>
        {state?.errors?.description && (
          <ErrorMessage message={state.errors.description} />
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" asChild disabled={isPending}>
          <Link href="/forms">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner className="mr-2 h-4 w-4" />}
          {isPending ? "Creating your form..." : "Create Form"}
        </Button>
      </div>

      {isFormCreatedState && (
        <div className="flex justify-center">
          <FormSuccessMessage
            title="Form created successfully!"
            message="Opening form designer..."
            variant="compact"
            className="mt-4"
          />
        </div>
      )}
    </form>
  );
}
