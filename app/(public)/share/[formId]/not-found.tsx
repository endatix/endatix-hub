import { NotFoundComponent } from "@/components/error-handling/not-found";

export default function NotFoundFormPage() {
  return (
    <NotFoundComponent
      notFoundTitle="Form not found"
      notFoundSubtitle="The form you are looking for does not exist."
      notFoundMessage="Please check the form ID and try again."
    >
    </NotFoundComponent>
  );
}
