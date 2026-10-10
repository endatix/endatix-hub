import { FormPageHeaderSlot } from "@/features/forms/form-workspace/ui/form-page-header-slot";

type Params = { params: Promise<{ formId: string }> };

export default async function FormOverviewHeaderSlot({ params }: Params) {
  const { formId } = await params;
  return <FormPageHeaderSlot formId={formId} active="overview" />;
}
