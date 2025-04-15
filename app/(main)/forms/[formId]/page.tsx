import { Form, FormDefinition } from "@/types";
import { getForm, getActiveFormDefinition } from "@/services/api";
import { FormEditorProps } from "@/features/forms/ui/editor/form-editor";
import FormEditorContainer from "@/features/forms/ui/editor/form-editor-container";
import { Suspense } from "react";
import FormEditorLoader from "@/features/forms/ui/editor/form-editor-loader";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormEditPage({ params }: Params) {
  const { formId } = await params;

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

  if (!form || !formJson) {
    return <div>Form not found</div>;
  }

  const props: FormEditorProps = {
    formId: formId,
    formJson: formJson,
    formName: form.name,
    slkVal: process.env.NEXT_PUBLIC_SLK,
    themeId: form.themeId ?? undefined,
  };

  return (
    <Suspense fallback={<FormEditorLoader />}>
      <div className="h-dvh overflow-hidden gap-4">
        <FormEditorContainer {...props} />
      </div>
    </Suspense>
  );
}
