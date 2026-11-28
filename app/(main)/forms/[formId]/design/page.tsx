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
import { getAudienceVariablesAction } from "@/features/audience/get-audience-variables";
import {
  findParticipantsAction,
  getParticipantPresetAction,
} from "@/features/audience/find-participant";
import { declareAudienceVariableAction } from "@/features/audience/create-property";
import { saveTestParticipantsAction } from "@/features/audience/save-test-participants";
import {
  type DesignerAudienceRead,
  loadDesignerAudience,
} from "@/features/audience/server";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";
import { getCurrentConversationUseCase } from "@/features/forms/use-cases/design-form/get-current-conversation.use-case";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { loadEditorSource } from "@/features/forms/edit-draft/editor-source.server";
import { getFormDesignReturn } from "@/features/forms/form-workspace";
import {
  firstSearchParam,
  type SearchParamValue,
} from "@/lib/utils/next-utils";
import { EndatixApi } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { Form } from "@/types";
import type { DesignerAudience } from "@/lib/personalization/authoring";
import Link from "next/link";
import { Suspense } from "react";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ from?: SearchParamValue }>;
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

export default async function FormDesignerPage({
  params,
  searchParams,
}: Readonly<Params>) {
  const session = await auth();
  const access = await authorization(session);
  await access.requireHubAccess();

  const { formId } = await params;
  const aiFeaturesEnabled = await aiFeaturesFlag();
  const chatContextPromise = getCurrentConversationUseCase(formId, session);

  const api = new EndatixApi(session?.accessToken);
  const [
    settingsRes,
    foldersRes,
    formResult,
    audienceForDesign,
  ] = await Promise.all([
    api.tenant.getSettings(),
    api.folders.list(),
    api.forms.get(formId).then((apiResult) =>
      toResult(apiResult, {
        fallbackMessage: "Failed to load form.",
        logMessage: "Failed to load form for design.",
        loggerName: "forms.design",
      }),
    ),
    loadDesignerAudience({
      api,
      formId,
      checkPermission: access.checkPermission,
    }),
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

  const source = await loadEditorSource(api, form, access);
  if (Result.isError(source)) return <HubPageLoadError result={source} />;

  const props: FormDesignerWrapperProps = {
    formId: formId,
    source: source.value,
    formName: form.name,
    themeId: form.themeId ?? undefined,
    isPublic: form.isPublic,
    formIsEnabled: form.isEnabled,
    audience: audienceForDesign && designerAudience(formId, audienceForDesign),
    designReturn: getFormDesignReturn(
      formId,
      firstSearchParam((await searchParams).from),
    ),
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
                key={source.value.scope}
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

/** The variables read with the page, and the form's reads and writes behind Preview as. */
function designerAudience(
  formId: string,
  { variables, identifierKind }: DesignerAudienceRead,
): DesignerAudience {
  return {
    variables,
    refresh: getAudienceVariablesAction.bind(null, formId),
    testParticipants: identifierKind
      ? {
          identifierKind,
          save: saveTestParticipantsAction.bind(null, formId),
        }
      : undefined,
    addProperty: declareAudienceVariableAction.bind(null, formId),
    participants: {
      find: findParticipantsAction.bind(null, formId),
      preset: getParticipantPresetAction.bind(null, formId),
    },
  };
}
