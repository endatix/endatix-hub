"use client";

import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { resolverVisit } from "@/lib/routes/optional-resolver";
import { displayedResolver } from "@/lib/routes/displayed-resolver";
import { TERMS_PATH } from "@/lib/routes/terms-journey";
import { withBasePath } from "@/lib/hosting/base-path";

export function ReviewActionLink({ href }: Readonly<{ href?: Route | null }>) {
  if (!href) return null;
  return (
    <Button variant="link" asChild>
      <Link
        href={resolverVisit(href)}
        prefetch={false}
        onNavigate={(event) => {
          if (href !== TERMS_PATH) return;
          event.preventDefault();
          window.location.assign(withBasePath(displayedResolver(href)));
        }}
      >
        Review action
      </Link>
    </Button>
  );
}
