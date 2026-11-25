import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ReviewActionLink({ href }: Readonly<{ href?: string | null }>) {
  if (!href) return null;
  return (
    <Button variant="link" asChild>
      <Link href={href} prefetch={false}>
        Review action
      </Link>
    </Button>
  );
}
