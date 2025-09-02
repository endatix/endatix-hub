import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormPage({ params }: Params) {
  const { formId } = await params;
  
  // Redirect to the designer for now - this can be changed later to show an overview page
  redirect(`/forms/${formId}/designer`);
}
