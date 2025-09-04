import { Form } from "@/types";
import { getForm } from "@/services/api";
import FormDetails from "@/features/forms/ui/form-details";

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Form not found</h2>
          <p className="text-gray-600 mt-2">The form you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <FormDetails 
      form={form}
      showHeader={true}
    />
  );
}
