import type { ReactNode } from "react";
import type { Route } from "next";
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  /** One plain sentence on what the value means. */
  detail: ReactNode;
  /** Where the fact is explored or changed; the whole card becomes that link. */
  href?: Route;
};

function StatCardIcon({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function StatCardBody(props: Readonly<StatCardProps>) {
  return (
    <>
      <div className="flex items-center gap-3">
        <StatCardIcon icon={props.icon} />
        <span className="flex-1 text-sm font-medium text-muted-foreground">
          {props.label}
        </span>
        {props.href ? (
          <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        ) : null}
      </div>
      <div className="text-2xl font-semibold tracking-tight">{props.value}</div>
      <div className="text-sm text-muted-foreground">{props.detail}</div>
    </>
  );
}

const CARD_CLASS =
  "flex h-full flex-col gap-3 rounded-xl border bg-card p-5 text-card-foreground shadow-sm";

/**
 * One fact about a record at a glance: an icon tile, a label, the value and one sentence. With
 * `href` the whole card is the way to explore or change it, marked by the corner arrow.
 */
export function StatCard(props: Readonly<StatCardProps>) {
  if (!props.href) {
    return (
      <div className={CARD_CLASS}>
        <StatCardBody {...props} />
      </div>
    );
  }
  return (
    <Link
      href={props.href}
      className={cn(
        CARD_CLASS,
        "group transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <StatCardBody {...props} />
    </Link>
  );
}
