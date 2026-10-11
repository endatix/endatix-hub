import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotFoundComponent } from "@/components/error-handling/not-found";

export function FormAudienceNotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Form not found"
      notFoundSubtitle="We couldn't find that form."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    >
      <Button asChild>
        <Link href="/forms">Back to forms</Link>
      </Button>
    </NotFoundComponent>
  );
}
