"use client";

import { useRouter } from "next/navigation";
import { ResultLoadErrorView } from "./result-load-error-view";
import type { Error as ResultError } from "@/lib/result";

export interface HubPageLoadErrorProps {
  result: ResultError;
}

/**
 * Server pages pass a Hub `Result` error here so ProblemDetails fields survive
 * without throwing into `error.tsx`.
 */
export function HubPageLoadError({ result }: Readonly<HubPageLoadErrorProps>) {
  const router = useRouter();

  return (
    <ResultLoadErrorView result={result} onRetry={() => router.refresh()} />
  );
}
