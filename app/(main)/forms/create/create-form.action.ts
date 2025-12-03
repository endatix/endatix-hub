"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { CreateFormRequestSchema } from "@/lib/form-types";
import { revalidatePath } from "next/cache";

export interface CreateFormActionState {
  isSuccess: boolean;
  formErrors?: string[];
  errors?: {
    name?: string[];
    description?: string[];
  };
  values?: {
    name?: string;
    description?: string;
  };
  formId?: string;
}

const EMPTY_FORM_DEFINITION = {};

export async function createFormAction(
  _prevState: CreateFormActionState,
  formData: FormData,
): Promise<CreateFormActionState> {
  try {
    const session = await auth();
    const { requireHubAccess } = await authorization(session);
    await requireHubAccess();

    const rawData = {
      name: formData.get("name")?.toString().trim() ?? "",
      description: formData.get("description")?.toString().trim() ?? "",
    };

    const initialFormRequest = {
      name: rawData.name,
      description: rawData.description || undefined,
      isEnabled: false,
      formDefinitionJsonData: JSON.stringify(EMPTY_FORM_DEFINITION),
    };

    const validatedRequestData =
      CreateFormRequestSchema.safeParse(initialFormRequest);

    if (!validatedRequestData.success) {
      const errors = validatedRequestData.error.flatten();
      return {
        isSuccess: false,
        formErrors: errors.formErrors,
        errors: errors.fieldErrors,
        values: rawData,
      };
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
        values: rawData,
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
      values: rawData,
    };
  }
}
