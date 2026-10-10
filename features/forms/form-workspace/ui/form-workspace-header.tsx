import type { ReactNode } from "react";
import PageTitle from "@/components/headings/page-title";

type FormWorkspaceHeaderProps = {
  /** The page's name ("Audience"); the form's name is in the header trail above. */
  title: string;
  /** Only what the trail and title do not already say. */
  description?: ReactNode;
  /** The page's own actions. Design is in the header's action area, not here. */
  actions?: ReactNode;
};

/**
 * The masthead of a page of a form. Moving between the form's pages and opening the designer
 * happen in the header, so the masthead holds only the page's name and its own actions.
 */
export function FormWorkspaceHeader(props: Readonly<FormWorkspaceHeaderProps>) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-prose min-w-0 flex-col gap-1">
        <PageTitle title={props.title} className="text-2xl break-words" />
        {props.description ? (
          <p className="text-muted-foreground">{props.description}</p>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex flex-wrap items-center gap-2">{props.actions}</div>
      ) : null}
    </header>
  );
}
