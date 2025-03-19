import { notFound } from "next/navigation";
import FormTemplateEditorContainer from "../../../../../features/form-templates/ui/form-template-editor-container";
import { getFormTemplate } from "@/services/api";

type Params = {
  params: Promise<{ templateId: string }>;
};

export default async function FormTemplateEditPage({ params }: Params) {
  const { templateId } = await params;

  try {
    const template = await getFormTemplate(templateId);

    if (!template) {
      notFound();
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

    return <FormTemplateEditorContainer {...props} />;
  } catch (error) {
    console.error("Error fetching template:", error);
    notFound();
  }
}
