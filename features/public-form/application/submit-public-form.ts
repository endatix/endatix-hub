import type { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "@/lib/endatix-api";
import { mapResponseToApiError } from "@/lib/endatix-api/shared/http-error-mapper";
import { withBasePath } from "@/lib/hosting";
import type {
  SubmissionOperation,
  SubmissionOperationResult,
} from "./submit-form-operation";

/** What a failed call says: the network error, then the unreadable response. */
export type SubmissionCallMessages = { network: string; parse: string };

/**
 * Submits a public form by making a POST request to the hub's /submissions endpoint.
 * @param formId - The ID of the form.
 * @param submissionData - The submission data.
 * @param urlToken - The URL token.
 * @returns The submission operation result.
 */
export async function submitPublicForm(
  formId: string,
  submissionData: SubmissionData,
  urlToken?: string,
): Promise<SubmissionOperationResult> {
  return postSubmissionOperation(
    `/api/public/v0/forms/${encodeURIComponent(formId)}/submissions`,
    { submissionData, urlToken },
    {
      network: "Network error while submitting form.",
      parse: "Failed to parse submission response.",
    },
  );
}

/**
 * POSTs to one of the hub's public submission routes and reads the submission operation back.
 * @param path - The route, without the base path.
 * @param body - The JSON body.
 * @param messages - What a failed call says.
 */
export async function postSubmissionOperation(
  path: string,
  body: unknown,
  messages: SubmissionCallMessages,
): Promise<SubmissionOperationResult> {
  const endpoint = withBasePath(path);
  const response = await send(endpoint, body);
  return toOperationResult(response, { endpoint, method: "POST" }, messages);
}

function toOperationResult(
  response: Response | Error,
  details: { endpoint: string; method: string },
  messages: SubmissionCallMessages,
): Promise<SubmissionOperationResult> | SubmissionOperationResult {
  if (response instanceof Error) {
    return ApiResult.networkError(messages.network, {
      ...details,
      details: response.message,
    });
  }

  return response.ok
    ? readOperation(response, details, messages.parse)
    : mapResponseToApiError<SubmissionOperation>(response, {
        ...details,
        statusCode: response.status,
      });
}

/** The response, or the error that kept the request from reaching the hub. */
async function send(
  endpoint: string,
  body: unknown,
): Promise<Response | Error> {
  try {
    return await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

async function readOperation(
  response: Response,
  details: { endpoint: string; method: string },
  parseMessage: string,
): Promise<SubmissionOperationResult> {
  try {
    return ApiResult.success((await response.json()) as SubmissionOperation);
  } catch (error) {
    return ApiResult.jsonParseError(parseMessage, {
      ...details,
      statusCode: response.status,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
