"use client";

import { redirect, usePathname } from "next/navigation";
import Link from "next/link";
import { displayedResolver } from "@/lib/routes/displayed-resolver";
import { TERMS_PATH } from "@/lib/routes/terms-journey";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  REQUIRED_ACTIONS_PATH,
  resolveTarget,
} from "@/lib/routes/resolve-target";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";

export function StandingRefusal({
  refusal,
}: Readonly<{ refusal: RequiredActionError }>) {
  const target = resolveTarget(refusal.actions, usePathname());
  if (target === TERMS_PATH) return <VisitTerms />;
  if (target) redirect(displayedResolver(target));
  return (
    <p>
      This request needs a pending account action.{" "}
      <Link href={REQUIRED_ACTIONS_PATH}>View account status</Link>
    </p>
  );
}

function VisitTerms() {
  const router = useRouter();
  useEffect(() => {
    router.replace(displayedResolver(TERMS_PATH));
  }, [router]);
  return <Link href={TERMS_PATH}>Review the Terms</Link>;
}
