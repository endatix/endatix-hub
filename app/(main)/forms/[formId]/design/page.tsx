import { auth } from "@/auth";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { Button } from "@/components/ui/button";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { authorization } from "@/features/auth/authorization";
import FormDesignerWrapper, {
  FormDesignerWrapperProps,
} from "@/features/forms/ui/designer/form-designer-wrapper";
import { getSurveyLicenseKey } from "@/features/config/server";
import { SurveyLicenseProvider } from "@/features/config/survey-license-provider";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import FormEditorLoader from "@/features/forms/ui/editor/form-editor-loader";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";
import { getCurrentConversationUseCase } from "@/features/forms/use-cases/design-form/get-current-conversation.use-case";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { Form } from "@/types";
import Link from "next/link";
import { Suspense } from "react";

type Params = {
  params: Promise<{ formId: string }>;
};

function formNotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Form not found"
      notFoundSubtitle="We couldn't find that form."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    >
      <Button asChild>
        <Link href="/forms">Back to forms</Link>
      </Button>
    </NotFoundComponent>
  );
}

function parseFormDefinitionJson(jsonData: string | undefined): object | null {
  if (!jsonData) {
    return null;
  }

  try {
    return JSON.parse(jsonData) as object;
  } catch (error) {
    console.error("Failed to parse form definition JSON:", error);
    return null;
  }
}

export default async function FormDesignerPage({ params }: Params) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const aiFeaturesEnabled = await aiFeaturesFlag();
  const chatContextPromise = getCurrentConversationUseCase(formId, session);

  const api = new EndatixApi(session?.accessToken);
  const [settingsRes, foldersRes, formResult] = await Promise.all([
    api.tenant.getSettings(),
    api.folders.list(),
    api.forms.get(formId).then((apiResult) =>
      toResult(apiResult, {
        fallbackMessage: "Failed to load form.",
        logMessage: "Failed to load form for design.",
        loggerName: "forms.design",
      }),
    ),
  ]);

  if (Result.isError(formResult)) {
    if (formResult.statusCode === 404) {
      return formNotFound();
    }

    return <HubPageLoadError result={formResult} />;
  }

  const form: Form = formResult.value;
  const requireFolderForNewForms =
    settingsRes.success && settingsRes.data.requireFolderAssignment === true;
  const assignableFolders =
    foldersRes.success && foldersRes.data.length > 0
      ? foldersRes.data.map((f) => ({ id: f.id, name: f.name }))
      : [];

  let formJson: object | null = null;
  let formDefinitionJson: string | undefined;

  if (form.activeDefinitionId) {
    const definitionResult = toResult(
      await api.definitions.get(formId, form.activeDefinitionId),
      {
        fallbackMessage: "Failed to load form definition.",
        logMessage: "Failed to load form definition for design.",
        loggerName: "forms.design",
      },
    );

    // A missing definition is not a missing form - keep the load-error chrome so the
    // 404 reads as "this resource", not "we couldn't find that form".
    if (Result.isError(definitionResult)) {
      return <HubPageLoadError result={definitionResult} />;
    }

    formDefinitionJson = definitionResult.value.jsonData;
    // A stored definition that is not valid JSON must not take the whole route
    // segment into error.tsx - open the designer empty, as it did before.
    formJson = parseFormDefinitionJson(formDefinitionJson);
  }

  const props: FormDesignerWrapperProps = {
    formId: formId,
    formJson: formJson,
    formName: form.name,
    themeId: form.themeId ?? undefined,
    isPublic: form.isPublic,
    formIsEnabled: form.isEnabled,
  };

  return (
    <div data-full-bleed className="h-dvh max-w-[100vw] overflow-hidden">
      <Suspense fallback={<FormEditorLoader />}>
        <SurveyLicenseProvider value={getSurveyLicenseKey()}>
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
        </SurveyLicenseProvider>
      </Suspense>
    </div>
  );
}
