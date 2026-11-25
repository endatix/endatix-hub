"use client";

import Link from "next/link";
import { toast } from "@/components/ui/toast";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";
import { normalizeBasePath, withBasePath } from "@/lib/hosting/base-path";
import {
  REQUIRED_ACTIONS_PATH,
  resolveTarget,
} from "@/lib/routes/resolve-target";

interface ActionFailure {
  message: string;
  requiredAction?: RequiredActionError;
}

/** Present only the final workflow outcome: intermediate failures can still require compensation. */
export function showActionFailure(failure: ActionFailure, fallback?: string) {
  if (!failure.requiredAction)
    return toast.error(failure.message || fallback || "Request failed");
  return showStandingRefusal(failure.requiredAction);
}

export function showStandingRefusal(refusal: RequiredActionError) {
  const path = window.location.pathname.slice(normalizeBasePath().length);
  const target = resolveTarget(refusal.actions, path);
  if (target) return window.location.replace(withBasePath(target));
  return toast.warning({
    title: "An account action is required.",
    description: <Link href={REQUIRED_ACTIONS_PATH}>View account status</Link>,
  });
}
