import { Form } from "@/types";
import { getForm } from "@/services/api";
import FormDetails from "@/features/forms/ui/form-details";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormOverviewPage({ params }: Params) {
  const { formId } = await params;

  let form: Form | null = null;

  try {
    form = await getForm(formId);
  } catch (error) {
    console.error("Failed to load form:", error);
  }

  if (!form) {
    return (
      <NotFoundComponent
        notFoundTitle="Form not found"
        notFoundSubtitle="The form you are looking for does not exist."
        notFoundMessage="Please check the form ID and try again."
        titleSize="medium"
      >
        <Link href="/forms">
          <Button>Back to forms</Button>
        </Link>
      </NotFoundComponent>
    );
  }

  return <FormDetails form={form} showHeader={true} />;
}
