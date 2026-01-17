import FormTemplateEditorContainer from "@/features/form-templates/ui/form-template-editor-container";
import { getFormTemplate } from "@/services/api";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FormTemplate } from "@/types";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  createStorageConfigClient,
  generateReadTokensAction,
} from "@/features/storage/server";
import { StorageConfigProvider } from "@/features/storage/client";
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

  const storageConfig = createStorageConfigClient().config;
  const readTokenPromises = {
    userFiles: generateReadTokensAction(
      storageConfig.containerNames.USER_FILES,
    ),
    content: generateReadTokensAction(storageConfig.containerNames.CONTENT),
  };

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
    <Suspense fallback={<FormEditorLoader />}>
      <div className="h-dvh overflow-hidden max-w-[100vw] -m-6">
        <StorageConfigProvider
          config={storageConfig}
          readTokenPromises={readTokenPromises}
        >
          <FormTemplateEditorContainer {...props} />
        </StorageConfigProvider>
      </div>
    </Suspense>
  );
}
