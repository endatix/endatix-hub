import Link from "next/link";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import type { Error as ResultError } from "@/lib/result";

/** A missing form reads as "not found"; any other failure keeps the load-error page. */
export function FormLoadError({ result }: Readonly<{ result: ResultError }>) {
  if (result.statusCode !== 404) return <HubPageLoadError result={result} />;
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
