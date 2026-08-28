import { NotFoundComponent } from "@/components/error-handling/not-found";

export default function NotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Data list not found"
      notFoundSubtitle="We couldn't find that data list."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    ></NotFoundComponent>
  );
}
