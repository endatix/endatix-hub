"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { CreateFormRequestSchema } from "@/lib/form-types";
import { revalidatePath } from "next/cache";
import { ServerActionState } from "@/lib/utils/zod-error-utils";

export type CreateFormActionState = ServerActionState<{
  name?: string;
  description?: string;
}> & {
  formId?: string;
};

const EMPTY_FORM_DEFINITION = {};

export async function createFormAction(
  _prevState: CreateFormActionState,
  formData: FormData,
): Promise<CreateFormActionState> {
  try {
    const session = await auth();
    const { requireHubAccess } = await authorization(session);
    await requireHubAccess();

    const rawData = extractFormData(formData);

    const initialFormRequest = {
      name: rawData.name,
      description: rawData.description || undefined,
      isEnabled: true,
      formDefinitionJsonData: JSON.stringify(EMPTY_FORM_DEFINITION),
    };

    const validatedRequestData =
      CreateFormRequestSchema.safeParse(initialFormRequest);

    if (!validatedRequestData.success) {
      return ServerActionState.fromZodError(validatedRequestData.error, rawData) as CreateFormActionState;
    }

    const endatix = new EndatixApi(session?.accessToken);
    const createFormResult = await endatix.forms.create(
      validatedRequestData.data,
    );

    if (ApiResult.isError(createFormResult)) {
      return {
        isSuccess: false,
        formErrors: [
          createFormResult.error.message ||
            "Failed to create form. Please try again.",
        ],
        data: rawData,
      };
    }

    revalidatePath("/(main)/forms");

    return {
      isSuccess: true,
      formId: createFormResult.data.id,
    };
  } catch (error) {
    console.error("Unexpected error in createFormAction:", error);
    const rawData = extractFormData(formData);
    return {
      isSuccess: false,
      formErrors: [
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again.",
      ],
      data: rawData,
    };
  }
}

function extractFormData(formData: FormData): {
  name: string;
  description: string;
} {
  return {
    name: formData.get("name")?.toString().trim() ?? "",
    description: formData.get("description")?.toString().trim() ?? "",
  };
}
