import { FormPageHeaderSlot } from "@/features/forms/form-workspace/ui/form-page-header-slot";

type Params = { params: Promise<{ formId: string }> };

/** Preview as is a view of the form's Audience, so the switcher keeps Audience current. */
export default async function FormPreviewAsHeaderSlot({
  params,
}: Readonly<Params>) {
  const { formId } = await params;
  return <FormPageHeaderSlot formId={formId} active="audience" />;
}
