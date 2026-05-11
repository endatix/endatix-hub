import { NotFoundComponent } from "@/components/error-handling/not-found";

export default function NotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="404"
      notFoundSubtitle="The data list you are looking for does not exist."
      notFoundMessage="Please check the data list ID and try again."
      titleSize="large"
    ></NotFoundComponent>
  );
}
