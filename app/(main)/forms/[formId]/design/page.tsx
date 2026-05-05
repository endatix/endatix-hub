import { auth } from "@/auth";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import { trackException } from "@/features/analytics/posthog/server";
import { AssetStorageProvider } from "@/features/asset-storage/server";
import { authorization } from "@/features/auth/authorization";
import FormDesignerWrapper, {
  FormDesignerWrapperProps,
} from "@/features/forms/ui/designer/form-designer-wrapper";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import FormEditorLoader from "@/features/forms/ui/editor/form-editor-loader";
import { FormAssistantProvider } from "@/features/forms/use-cases/design-form/form-assistant.context";
import { getCurrentConversationUseCase } from "@/features/forms/use-cases/design-form/get-current-conversation.use-case";
import { aiFeaturesFlag } from "@/lib/feature-flags/flags";
import { getForm, getFormDefinition } from "@/services/api";
import { Form, FormDefinition } from "@/types";
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

  let form: Form | null = null;
  let formJson: object | null = null;

  try {
    form = await getForm(formId);

    const response: FormDefinition = await getFormDefinition(formId, form.activeDefinitionId!);
    formJson = response?.jsonData ? JSON.parse(response.jsonData) : null;
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
        notFoundSubtitle="The form you are looking for does not exist."
        notFoundMessage="Please check the form ID and try again."
        titleSize="medium"
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
        <FormRuntimeProvider initialState={{ formId }}>
          <AssetStorageProvider>
            <FormAssistantProvider
              isAssistantEnabled={aiFeaturesEnabled}
              getConversationPromise={chatContextPromise}
            >
              <FormDesignerWrapper {...props} />
            </FormAssistantProvider>
          </AssetStorageProvider>
        </FormRuntimeProvider>
      </Suspense>
    </div>
  );
}
