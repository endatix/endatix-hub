import { FormPageHeaderSlot } from "@/features/forms/form-workspace/ui/form-page-header-slot";

type Params = { params: Promise<{ formId: string }> };

/** A participant is part of the form's Audience, so the switcher keeps Audience current. */
export default async function FormParticipantHeaderSlot({
  params,
}: Readonly<Params>) {
  const { formId } = await params;
  return <FormPageHeaderSlot formId={formId} active="audience" />;
}
