import type { ReactNode } from "react";

type SectionHeaderProps = {
  id: string;
  title: string;
  description: ReactNode;
  action: ReactNode;
  /** The view switch replaces the visible title; the title stays for screen readers. */
  viewSwitch?: ReactNode;
};

/** A list section's title, description and action, above its table (list-page recipe). */
export function SectionHeader(props: Readonly<SectionHeaderProps>) {
  const hasSwitch = Boolean(props.viewSwitch);
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-prose flex-col gap-3">
        <h2
          id={props.id}
          className={
            hasSwitch ? "sr-only" : "text-lg font-semibold tracking-tight"
          }
        >
          {props.title}
        </h2>
        {props.viewSwitch}
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </div>
      {props.action}
    </div>
  );
}
