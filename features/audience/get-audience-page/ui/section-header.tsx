import type { ReactNode } from "react";

type SectionHeaderProps = {
  id: string;
  title: string;
  description: ReactNode;
  action: ReactNode;
};

/** A list section's title, description and action, above its table (list-page recipe). */
export function SectionHeader(props: Readonly<SectionHeaderProps>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-prose flex-col gap-1.5">
        <h2 id={props.id} className="text-lg font-semibold tracking-tight">
          {props.title}
        </h2>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </div>
      {props.action}
    </div>
  );
}
