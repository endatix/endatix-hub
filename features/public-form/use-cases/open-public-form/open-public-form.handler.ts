import { openSubmissionOperation } from "@/features/public-form/application/open-submission-operation";
import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import {
  apiResponses,
  parseJsonBody,
  toApiResponse,
} from "@/lib/utils/route-handlers";
import { cookies } from "next/headers";
import {
  OpenPublicFormRequestSchema,
  type OpenPublicFormRequest,
} from "./open-public-form.types";

type OpenPublicFormRouteContext = {
  params: Promise<{ formId: string }>;
};

type OpenPublicFormHandlers = Record<
  "POST",
  (request: Request, context: OpenPublicFormRouteContext) => Promise<Response>
>;

async function openPublicFormPostHandler(
  request: Request,
  context: OpenPublicFormRouteContext,
): Promise<Response> {
  const { formId } = await context.params;
  if (!formId) {
    return apiResponses.badRequest({ detail: "Form ID is required" });
  }

  const parsedBody = await parseJsonBody<OpenPublicFormRequest>(request);
  if (!parsedBody.ok) {
    return parsedBody.error;
  }

  const validatedBody = OpenPublicFormRequestSchema.safeParse(parsedBody.value);
  if (!validatedBody.success) {
    return apiResponses.badRequest({
      detail:
        validatedBody.error.issues[0]?.message ??
        "Invalid open public form request body",
    });
  }

  const tokenStore = new FormTokenCookieStore(await cookies());
  const result = await openSubmissionOperation(
    formId,
    tokenStore,
    validatedBody.data.urlToken,
  );

  return toApiResponse(result);
}

/** The handlers for the open public form route: the respondent's form calls it once it shows. */
export const openPublicFormHandlers: OpenPublicFormHandlers = {
  POST: openPublicFormPostHandler,
};
