import { auth } from "@/auth";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import { trackException } from "@/features/analytics/posthog/server";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { authorization } from "@/features/auth/authorization";
import FormDesignerWrapper, {
  FormDesignerWrapperProps,
} from "@/features/forms/ui/designer/form-designer-wrapper";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import FormEditorLoader from "@/features/forms/ui/editor/form-editor-loader";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";
import { getCurrentConversationUseCase } from "@/features/forms/use-cases/design-form/get-current-conversation.use-case";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { getForm } from "@/services/api";
import { Form } from "@/types";
import Link from "next/link";
import { Suspense } from "react";

type Params = {
  params: Promise<{ formId: string }>;
};

export default async function FormDesignerPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const aiFeaturesEnabled = await aiFeaturesFlag();
  const chatContextPromise = getCurrentConversationUseCase(formId, session);

  const api = new EndatixApi(session?.accessToken);
  const [settingsRes, foldersRes] = await Promise.all([
    api.tenant.getSettings(),
    api.folders.list(),
  ]);
  const requireFolderForNewForms =
    settingsRes.success && settingsRes.data.requireFolderAssignment === true;
  const assignableFolders =
    foldersRes.success && foldersRes.data.length > 0
      ? foldersRes.data.map((f) => ({ id: f.id, name: f.name }))
      : [];

  let form: Form | null = null;
  let formJson: object | null = null;
  let formDefinitionJson: string | undefined;

  try {
    form = await getForm(formId);

    if (form.activeDefinitionId) {
      const definitionResult = await api.definitions.get(
        formId,
        form.activeDefinitionId,
      );
      if (ApiResult.isSuccess(definitionResult)) {
        formDefinitionJson = definitionResult.data.jsonData;
        formJson = formDefinitionJson ? JSON.parse(formDefinitionJson) : null;
      }
    }
  } catch (error) {
    console.error("Failed to load form:", error);

    await trackException(error, {
      operation: "load_form",
      form_id: formId,
      timestamp: new Date().toISOString(),
    });

    formJson = null;
  }

  if (!form) {
    return (
      <NotFoundComponent
        notFoundTitle="Form not found"
        notFoundSubtitle="We couldn't find that form."
        notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
      >
        <Link href="/forms">
          <Button>Back to forms</Button>
        </Link>
      </NotFoundComponent>
    );
  }

  const props: FormDesignerWrapperProps = {
    formId: formId,
    formJson: formJson,
    formName: form.name,
    slkVal: process.env.NEXT_PUBLIC_SLK,
    themeId: form.themeId ?? undefined,
    isPublic: form.isPublic,
    formIsEnabled: form.isEnabled,
  };

  return (
    <div data-full-bleed className="h-dvh max-w-[100vw] overflow-hidden">
      <Suspense fallback={<FormEditorLoader />}>
        <DesignerRuntimeProvider
          initialState={{
            formId,
            formName: form.name,
            folderId: form.folderId,
            isPublic: form.isPublic,
            formIsEnabled: form.isEnabled,
          }}
        >
          <AssetStorageProvider>
            <FormAssistantProvider
              isAssistantEnabled={aiFeaturesEnabled}
              getConversationPromise={chatContextPromise}
              requireFolderForNewForms={requireFolderForNewForms}
              assignableFolders={assignableFolders}
            >
              <FormDesignerWrapper {...props} />
            </FormAssistantProvider>
          </AssetStorageProvider>
        </DesignerRuntimeProvider>
      </Suspense>
    </div>
  );
}
