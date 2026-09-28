"use client";

import { PublicFormUnexpectedError } from "@/features/public-form/ui/public-form-unexpected-error";

export default function EmbedFormError({
  error,
  retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
  return (
    <PublicFormUnexpectedError error={error} retry={retry} variant="embed" />
  );
}
