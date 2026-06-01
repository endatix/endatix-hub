import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { submitFormOperation } from "@/features/public-form/application/submit-form-operation";
import {
  apiResponses,
  parseJsonBody,
  toApiResponse,
} from "@/lib/utils/route-handlers";
import { cookies } from "next/headers";
import {
  SubmitPublicFormRequestSchema,
  type SubmitPublicFormRequest,
} from "./submit-public-form.types";

type SubmitPublicFormRouteContext = {
  params: Promise<{ formId: string }>;
};

type SubmitPublicFormHandlers = Record<
  "POST",
  (request: Request, context: SubmitPublicFormRouteContext) => Promise<Response>
>;

async function submitPublicFormPostHandler(
  request: Request,
  context: SubmitPublicFormRouteContext,
): Promise<Response> {
  const { formId } = await context.params;
  if (!formId) {
    return apiResponses.badRequest({ detail: "Form ID is required" });
  }

  const parsedBody = await parseJsonBody<SubmitPublicFormRequest>(request);
  if (!parsedBody.ok) {
    return parsedBody.error;
  }

  const validatedBody = SubmitPublicFormRequestSchema.safeParse(parsedBody.value);
  if (!validatedBody.success) {
    return apiResponses.badRequest({
      detail:
        validatedBody.error.issues[0]?.message ??
        "Invalid submit public form request body",
    });
  }

  const { submissionData, urlToken } = validatedBody.data;

  const cookieStore = await cookies();
  const tokenStore = new FormTokenCookieStore(cookieStore);
  const result = await submitFormOperation(
    formId,
    submissionData,
    tokenStore,
    urlToken,
  );

  return toApiResponse(result);
}

/**
 * The handlers for the submit public form route.
 * @returns The handlers for the submit public form route.
 */
export const submitPublicFormHandlers: SubmitPublicFormHandlers = {
  /**
   * Handles the submission of a public form.
   * @param request - The request object.
   * @param context - The context object.
   * @returns The response object.
   */
  POST: submitPublicFormPostHandler,
};
