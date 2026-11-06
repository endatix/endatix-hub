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
  const body = formId
    ? await readBody(request)
    : apiResponses.badRequest({ detail: "Form ID is required" });
  if (body instanceof Response) {
    return body;
  }

  const tokenStore = new FormTokenCookieStore(await cookies());
  return toApiResponse(
    await openSubmissionOperation(formId, tokenStore, body.urlToken),
  );
}

/** The validated body, or the 400 that says why it isn't. */
async function readBody(
  request: Request,
): Promise<OpenPublicFormRequest | Response> {
  const parsedBody = await parseJsonBody<OpenPublicFormRequest>(request);
  if (!parsedBody.ok) {
    return parsedBody.error;
  }

  const validatedBody = OpenPublicFormRequestSchema.safeParse(parsedBody.value);
  return validatedBody.success
    ? validatedBody.data
    : apiResponses.badRequest({
        detail:
          validatedBody.error.issues[0]?.message ??
          "Invalid open public form request body",
      });
}

/** The handlers for the open public form route: the respondent's form calls it once it shows. */
export const openPublicFormHandlers: OpenPublicFormHandlers = {
  POST: openPublicFormPostHandler,
};
