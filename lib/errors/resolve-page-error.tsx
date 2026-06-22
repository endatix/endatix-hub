import { SIGNIN_PATH, UNAUTHORIZED_PATH } from "@/features/auth";
import type { PageError } from "@/lib/errors/page-error";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

export function resolvePageError(error: PageError): ReactNode {
  if (error.kind === "not_found") {
    notFound();
  }

  if (error.kind === "auth") {
    redirect(SIGNIN_PATH);
  }

  if (error.kind === "forbidden") {
    redirect(UNAUTHORIZED_PATH);
  }

  return <div className="text-sm text-destructive">{error.message}</div>;
}
