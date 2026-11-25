"use client";

import { redirect, usePathname } from "next/navigation";
import Link from "next/link";
import {
  REQUIRED_ACTIONS_PATH,
  resolveTarget,
} from "@/lib/routes/resolve-target";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";

export function StandingRefusal({
  refusal,
}: Readonly<{ refusal: RequiredActionError }>) {
  const target = resolveTarget(refusal.actions, usePathname());
  if (target) redirect(target);
  return (
    <p>
      This request needs a pending account action.{" "}
      <Link href={REQUIRED_ACTIONS_PATH}>View account status</Link>
    </p>
  );
}
