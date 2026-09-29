import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextLinkProps = {
  children: ReactNode;
  className?: string;
} & (
  | { href: Route; external?: false }
  /** Leaves the Hub: new tab, trailing mark, and an `sr-only` notice. */
  | { href: string; external: true }
);

const TEXT_LINK_CLASS_NAME =
  "inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none";

/**
 * An inline link inside prose, a `SummaryRow` value or a panel section — not a
 * button. `DESIGN.md` §5 Links.
 */
export function TextLink(props: Readonly<TextLinkProps>) {
  const className = cn(TEXT_LINK_CLASS_NAME, props.className);

  if (props.external) {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {props.children}
        <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={props.href} className={className}>
      {props.children}
    </Link>
  );
}
