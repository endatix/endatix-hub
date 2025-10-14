import { Form, FormDefinition } from "@/types";
import { getForm, getActiveFormDefinition } from "@/services/api";
import FormDesignerLayout, { FormDesignerLayoutProps } from "@/features/forms/ui/designer/form-designer-wrapper";
import { Suspense } from "react";
import FormEditorLoader from "@/features/forms/ui/editor/form-editor-loader";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormDesignerPage({ params }: Params) {
  const { formId } = await params;
  const ai = await aiFeaturesFlag();

  let form: Form | null = null;
  let formJson: object | null = null;

  try {
    form = await getForm(formId);

    const response: FormDefinition = await getActiveFormDefinition(formId);
    formJson = response?.jsonData ? JSON.parse(response.jsonData) : null;
  } catch (error) {
    console.error("Failed to load form:", error);
    formJson = null;
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

  const props: FormDesignerLayoutProps = {
    formId: formId,
    formJson: formJson,
    formName: form.name,
    slkVal: process.env.NEXT_PUBLIC_SLK,
    themeId: form.themeId ?? undefined,
    aiFeatureFlag: ai,
  };

  return (
    <Suspense fallback={<FormEditorLoader />}>
      <div className="h-dvh overflow-hidden max-w-[100vw] -m-6">
        <FormDesignerLayout {...props} />
      </div>
    </Suspense>
  );
}
