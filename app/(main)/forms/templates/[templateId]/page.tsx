import FormTemplateEditorContainer from "@/features/form-templates/ui/form-template-editor-container";
import { getFormTemplate } from "@/services/api";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FormTemplate } from "@/types";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";

type Params = {
  params: Promise<{ templateId: string }>;
};

export default async function FormTemplateEditPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { templateId } = await params;
  let template: FormTemplate | null = null;
  try {
    template = await getFormTemplate(templateId);
  } catch (error) {
    console.error("Error fetching template:", error);
  }

  if (!template) {
    return (
      <NotFoundComponent
        notFoundTitle="Template not found"
        notFoundSubtitle="The form template you are looking for does not exist."
        notFoundMessage="Please check the form template ID and try again."
        titleSize="medium"
      >
        <Link href="/forms/templates">
          <Button>Check all templates</Button>
        </Link>
      </NotFoundComponent>
    );
  }

  let templateJson = null;
  try {
    templateJson = JSON.parse(template.jsonData || "{}");
  } catch (error) {
    console.error("Error parsing template JSON data:", error);
    templateJson = {};
  }

  const props = {
    templateId: template.id,
    templateJson,
    templateName: template.name,
    description: template.description,
    isEnabled: template.isEnabled,
  };

  return (
    <div className="h-dvh overflow-hidden max-w-[100vw] -m-6">
      <FormTemplateEditorContainer {...props} />
    </div>
  );
}
