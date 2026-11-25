import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";

export function ReviewActionLink({ href }: Readonly<{ href?: Route | null }>) {
  if (!href) return null;
  return (
    <Button variant="link" asChild>
      <Link href={href} prefetch={false}>
        Review action
      </Link>
    </Button>
  );
}
