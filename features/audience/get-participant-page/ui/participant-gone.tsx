"use client";

import Link from "next/link";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import { useAudienceReturnHref } from "../../get-audience-page/ui/use-audience-return-href";

/** The participant was removed from this form (the API answers 404), or the link is wrong. */
export function ParticipantGone({ formId }: Readonly<{ formId: string }>) {
  const audienceHref = useAudienceReturnHref(formId);
  return (
    <NotFoundComponent
      notFoundCode={null}
      notFoundTitle="Participant"
      notFoundSubtitle="This participant is no longer on this form"
      notFoundMessage="They were removed from this form's audience, or the link is wrong. They stay on any other form they are on."
    >
      <Button asChild>
        <Link href={audienceHref}>Back to Audience</Link>
      </Button>
    </NotFoundComponent>
  );
}
