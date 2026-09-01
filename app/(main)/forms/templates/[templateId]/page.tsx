import FormTemplateEditorContainer from "@/features/form-templates/ui/form-template-editor-container";
import { getFormTemplate } from "@/services/api";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FormTemplate } from "@/types";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import { getSurveyLicenseKey } from "@/features/config/server";
import { SurveyLicenseProvider } from "@/features/config/survey-license-provider";
import { Suspense } from "react";
import FormEditorLoader from "@/features/forms/ui/editor/form-editor-loader";

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
        notFoundSubtitle="We couldn't find that template."
        notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
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
  };

  return (
    <div data-full-bleed className="h-dvh max-w-[100vw] overflow-hidden">
      <Suspense fallback={<FormEditorLoader />}>
        <SurveyLicenseProvider value={getSurveyLicenseKey()}>
          <DesignerRuntimeProvider
            initialState={{
              templateId,
            }}
          >
            <AssetStorageProvider>
              <FormTemplateEditorContainer {...props} />
            </AssetStorageProvider>
          </DesignerRuntimeProvider>
        </SurveyLicenseProvider>
      </Suspense>
    </div>
  );
}
