import { NotFoundComponent } from "@/components/error-handling/not-found";
import "@/components/error-handling/not-found/not-found-styles-standalone.css";

export default function NotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="404 - Page not found"
      notFoundSubtitle="The page you are looking for does not exist."
      notFoundMessage="Please check the URL and try again."
      titleSize="large"
    ></NotFoundComponent>
  );
}
