import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type FormOverviewLinkProps = {
  formId: number | string;
  label: string;
  className?: string;
};

export function FormOverviewLink({
  formId,
  label,
  className,
}: Readonly<FormOverviewLinkProps>) {
  const href = `/forms/${formId}` as Route;

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group/form-link inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <span className="truncate font-medium">{label}</span>
      <ArrowUpRight
        className="size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-all group-hover/form-link:text-foreground group-hover/form-link:opacity-100 group-focus-visible/form-link:text-foreground group-focus-visible/form-link:opacity-100"
        aria-hidden
      />
      <span className="sr-only">(opens in new tab)</span>
    </Link>
  );
}
