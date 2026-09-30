import Link from "next/link";
import { Button } from "@/components/ui/button";
import PageTitle from "@/components/headings/page-title";
import { AudiencePageClient } from "@/features/audience/ui";
import type { AudiencePageData } from "@/features/audience/get-audience-page";

type AudiencePageShellProps = {
  formId: string;
  formName: string;
  data: AudiencePageData;
};

export function AudiencePageShell(props: Readonly<AudiencePageShellProps>) {
  return (
    <div className="container py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle title={`Audience: ${props.formName}`} className="text-2xl" />
          <p className="mt-1 text-muted-foreground">
            Manage properties and people for this form.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/forms/${props.formId}`}>Back to form</Link>
        </Button>
      </div>
      <AudiencePageClient formId={props.formId} data={props.data} />
    </div>
  );
}
