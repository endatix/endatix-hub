import type { ReactNode } from "react";
import type { AudiencePageData } from "@/features/audience/get-audience-page";
import type { AudienceView } from "../audience-view";
import { AudiencePageClient } from "./audience-page-client";

type AudiencePageShellProps = {
  formId: string;
  /** The form's workspace header, composed by the route so this feature does not import forms. */
  header: ReactNode;
  view: AudienceView;
  data: AudiencePageData;
  /** Whitelisted list query (`page`, `pageSize`, `view`, `test`) for Back from a participant. */
  listSearch: string;
};

export function AudiencePageShell({
  header,
  ...client
}: Readonly<AudiencePageShellProps>) {
  return (
    <div className="container py-6">
      {header}
      <AudiencePageClient {...client} />
    </div>
  );
}
