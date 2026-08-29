import { NotFoundComponent } from "@/components/error-handling/not-found";

export default function NotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Page not found"
      notFoundSubtitle="We couldn't find that page."
      notFoundMessage="Check the URL and try again."
    ></NotFoundComponent>
  );
}
