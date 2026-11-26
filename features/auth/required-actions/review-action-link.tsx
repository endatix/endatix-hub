"use client";

import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { resolverVisit } from "@/lib/routes/optional-resolver";
import { TERMS_PATH, termsVisit } from "@/lib/routes/terms-journey";
import { usePathname, useSearchParams } from "next/navigation";

export function ReviewActionLink({ href, scope }: Readonly<{ href?: Route | null; scope?: string }>) {
  if (!href) return null;
  if (href === TERMS_PATH && scope) return <TermsNoticeLink scope={scope} />;
  return <ActionLink href={resolverVisit(href)} />;
}

function TermsNoticeLink({scope}: Readonly<{scope:string}>) {
  const path = usePathname(), query = useSearchParams();
  return <ActionLink href={termsVisit(`${path}?${query}`, scope)} />;
}

function ActionLink({href}: Readonly<{href:Route}>) {
  return (
    <Button variant="link" asChild>
      <Link href={href} prefetch={false}>
        Review action
      </Link>
    </Button>
  );
}
