import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageTitle from "@/components/headings/page-title";
import { Button } from "@/components/ui/button";
import type { AudiencePageData } from "@/features/audience/get-audience-page";
import { AudiencePageClient } from "./audience-page-client";

const PURPOSE =
  "The people this form is for, and what you know about each of them.";

type AudiencePageShellProps = {
  formId: string;
  formName: string;
  data: AudiencePageData;
};

function BackToForm({ formId }: Readonly<{ formId: string }>) {
  return (
    <Button variant="ghost" asChild>
      <Link href={`/forms/${formId}`}>
        <ArrowLeft />
        Back to form
      </Link>
    </Button>
  );
}

/** Same title shape as the form's other pages ("Submissions for …"). */
function AudienceMasthead({
  formId,
  formName,
}: Readonly<Omit<AudiencePageShellProps, "data">>) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-prose flex-col gap-1">
        <PageTitle title={`Audience for ${formName}`} className="text-2xl" />
        <p className="text-muted-foreground">{PURPOSE}</p>
      </div>
      <BackToForm formId={formId} />
    </div>
  );
}

export function AudiencePageShell({
  data,
  ...form
}: Readonly<AudiencePageShellProps>) {
  return (
    <div className="container py-6">
      <AudienceMasthead {...form} />
      <AudiencePageClient formId={form.formId} data={data} />
    </div>
  );
}
