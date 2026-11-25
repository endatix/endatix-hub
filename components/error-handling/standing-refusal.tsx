"use client";

import { redirect, usePathname } from "next/navigation";
import { resolveTarget } from "@/lib/routes/resolve-target";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";

export function StandingRefusal({
  refusal,
}: Readonly<{ refusal: RequiredActionError }>) {
  const target = resolveTarget(refusal.actions, usePathname());
  if (target) redirect(target);
  return <p>This request needs a pending account action to be completed.</p>;
}
