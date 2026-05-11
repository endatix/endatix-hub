import { NotFoundComponent } from "@/components/error-handling/not-found";

export default function NotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="404"
      notFoundSubtitle="The page you are looking for does not exist."
      notFoundMessage="Please check the URL and try again."
      titleSize="large"
    ></NotFoundComponent>
  );
}
