"use client";

import { PublicFormUnexpectedError } from "@/features/public-form/ui/public-form-unexpected-error";

export default function ShareFormError({
  error,
  retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return (
    <PublicFormUnexpectedError error={error} retry={retry} variant="share" />
  );
}
