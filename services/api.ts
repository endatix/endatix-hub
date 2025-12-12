import { getSession } from "@/features/auth";
import { SubmissionData } from "@/features/submissions/types";
import {
  CreateFormRequest,
  CreateFormTemplateRequest,
  CreateFormTemplateResult,
} from "@/lib/form-types";
import { redirect } from "next/navigation";
import { ITheme } from "survey-core";
import { ActiveDefinition, Form, FormDefinition, FormTemplate } from "../types";
import { HeaderBuilder } from "../lib/endatix-api/shared/header-builder";
import { Submission } from "@/lib/endatix-api";
import {
  validateEndatixId,
  validateHexToken,
} from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";

const API_BASE_URL = process.env.ENDATIX_API_URL;

export const createForm = async (
  formRequest: CreateFormRequest,
): Promise<FormTemplate> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(`${API_BASE_URL}/forms`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(formRequest),
  });

  if (!response.ok) {
    throw new Error("Failed to create form");
  }

  return response.json();
};

export const getForms = async (filter?: string): Promise<Form[]> => {
  const session = await getSession();
  const headers = new HeaderBuilder().withAuth(session).build();
  let url = `${API_BASE_URL}/forms?pageSize=100`;
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`;
  }

  const response = await fetch(url, {
    headers: headers,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
};

export const getForm = async (formId: string): Promise<Form> => {
  const requestOptions: RequestInit = {};

  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  requestOptions.headers = {
    Authorization: `Bearer ${session?.accessToken}`,
  };

  const validateIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateIdResult)) {
    throw new Error(validateIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateIdResult.value}`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch form");
  }

  return response.json();
};

export const updateForm = async (
  formId: string,
  data: {
    name?: string;
    isEnabled?: boolean;
    themeId?: string;
    webHookSettingsJson?: string | null;
  },
): Promise<void> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const validateIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateIdResult)) {
    throw new Error(validateIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateIdResult.value}`,
    {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update form");
  }
};

export const deleteForm = async (formId: string): Promise<string> => {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const validatedIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validatedIdResult)) {
    throw new Error(validatedIdResult.message);
  }

  const headers = new HeaderBuilder().withAuth(session).build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${validatedIdResult.value}`,
    {
      method: "DELETE",
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete form");
  }

  return response.text();
};

export const getActiveFormDefinition = async (
  formId: string,
  allowAnonymous: boolean = false,
): Promise<ActiveDefinition> => {
  const requestOptions: RequestInit = {};
  const headerBuilder = new HeaderBuilder();

  if (!allowAnonymous) {
    const session = await getSession();

    if (!session.isLoggedIn) {
      redirect("/login");
    }

    headerBuilder.withAuth(session);
  }

  const validateIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateIdResult)) {
    throw new Error(validateIdResult.message);
  }

  requestOptions.headers = headerBuilder.build();
  const response = await fetch(
    `${API_BASE_URL}/forms/${validateIdResult.value}/definition`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch form definition for formId ${formId}`);
  }

  return response.json();
};

export const getFormDefinition = async (
  formId: string,
  definitionId: string,
): Promise<FormDefinition> => {
  if (!formId) {
    throw new Error(`FormId is required`);
  }

  if (!definitionId) {
    throw new Error(`DefinitionId is required`);
  }

  const requestOptions: RequestInit = {};
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder().withAuth(session).build();
  requestOptions.headers = headers;

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const validateDefinitionIdResult = validateEndatixId(
    definitionId,
    "definitionId",
  );
  if (Result.isError(validateDefinitionIdResult)) {
    throw new Error(validateDefinitionIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateFormIdResult.value}/definitions/${validateDefinitionIdResult.value}`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch form definition");
  }

  return response.json();
};

export const updateFormDefinition = async (
  formId: string,
  isDraft: boolean,
  jsonData: string,
): Promise<void> => {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateFormIdResult.value}/definition`,
    {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({ isDraft, jsonData }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update form definition");
  }
};

export interface ThemeResponse {
  id: string;
  name: string;
  description?: string;
  jsonData: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export const getThemes = async (
  page: number = 1,
  pageSize: number = 10,
): Promise<ThemeResponse[]> => {
  const session = await getSession();
  const headers = new HeaderBuilder().withAuth(session).acceptJson().build();

  const response = await fetch(
    `${API_BASE_URL}/themes?page=${page}&pageSize=${pageSize}`,
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch themes");
  }

  return response.json();
};

export const createTheme = async (theme: ITheme): Promise<ThemeResponse> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const createThemeRequest = {
    name: theme.themeName,
    jsonData: JSON.stringify(theme),
  };

  const response = await fetch(`${API_BASE_URL}/themes`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(createThemeRequest),
  });

  if (!response.ok) {
    throw new Error("Failed to create theme");
  }

  return response.json();
};

export const updateTheme = async (
  themeId: string,
  theme: ITheme,
): Promise<ThemeResponse> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const validateIdResult = validateEndatixId(themeId, "themeId");
  if (Result.isError(validateIdResult)) {
    throw new Error(validateIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/themes/${validateIdResult.value}`,
    {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify({ jsonData: JSON.stringify(theme) }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update theme");
  }

  return response.json();
};

export const deleteTheme = async (themeId: string): Promise<string> => {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder().withAuth(session).build();

  const validateThemeIdResult = validateEndatixId(themeId, "themeId");
  if (Result.isError(validateThemeIdResult)) {
    throw new Error(validateThemeIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/themes/${validateThemeIdResult.value}`,
    {
      method: "DELETE",
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete theme");
  }

  return response.text();
};

export const createFormTemplate = async (
  formTemplateRequest: CreateFormTemplateRequest,
): Promise<CreateFormTemplateResult> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(`${API_BASE_URL}/form-templates`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(formTemplateRequest),
  });

  if (!response.ok) {
    throw new Error("Failed to create form template");
  }

  const result = await response.json();
  return {
    isSuccess: response.ok,
    error: response.statusText,
    formTemplateId: result.id,
  };
};

export const getFormTemplates = async (): Promise<FormTemplate[]> => {
  const session = await getSession();
  const headers = new HeaderBuilder().withAuth(session).build();

  const response = await fetch(`${API_BASE_URL}/form-templates`, {
    headers: headers,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch form templates");
  }

  return response.json();
};

export const getFormTemplate = async (
  templateId: string,
): Promise<FormTemplate> => {
  const session = await getSession();
  const headers = new HeaderBuilder().withAuth(session).build();

  const validateTemplateIdResult = validateEndatixId(templateId, "templateId");
  if (Result.isError(validateTemplateIdResult)) {
    throw new Error(validateTemplateIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/form-templates/${validateTemplateIdResult.value}`,
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch form template");
  }

  return response.json();
};

export const updateFormTemplate = async (
  templateId: string,
  data: {
    name?: string;
    isEnabled?: boolean;
    jsonData?: string;
  },
): Promise<void> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const validateTemplateIdResult = validateEndatixId(templateId, "templateId");
  if (Result.isError(validateTemplateIdResult)) {
    throw new Error(validateTemplateIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/form-templates/${validateTemplateIdResult.value}`,
    {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update form template");
  }
};

export const deleteFormTemplate = async (
  templateId: string,
): Promise<string> => {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder().withAuth(session).build();

  const validateTemplateIdResult = validateEndatixId(templateId, "templateId");
  if (Result.isError(validateTemplateIdResult)) {
    throw new Error(validateTemplateIdResult.message);
  }

  const response = await fetch(
    `${API_BASE_URL}/form-templates/${validateTemplateIdResult.value}`,
    {
      method: "DELETE",
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to delete form template");
  }

  return response.text();
};

export const getSubmissions = async (formId: string): Promise<Submission[]> => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const CLIENT_PAGE_SIZE = 10_000;
  const headers = new HeaderBuilder().withAuth(session).build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions?pageSize=${CLIENT_PAGE_SIZE}`,
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
};

export const updateSubmission = async (
  formId: string,
  submissionId: string,
  submissionData: SubmissionData,
): Promise<Submission> => {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new Error(validateSubmissionIdResult.message);
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateFormIdResult.value}/submissions/${validateSubmissionIdResult.value}`,
    {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify(submissionData),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update submission");
  }

  return response.json();
};

interface UpdateSubmissionStatusRequest {
  status: string;
  formId: string;
  dateUpdated: Date;
}

export const updateSubmissionStatus = async (
  formId: string,
  submissionId: string,
  status: string,
): Promise<UpdateSubmissionStatusRequest> => {
  const session = await getSession();

  if (!session?.isLoggedIn) {
    redirect("/login");
  }

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new Error(validateSubmissionIdResult.message);
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateFormIdResult.value}/submissions/${validateSubmissionIdResult.value}/status`,
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to change submission status");
  }

  return response.json();
};

export const getPartialSubmissionPublic = async (
  formId: string,
  token: string,
): Promise<Submission> => {
  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const validateTokenResult = validateHexToken(token, "token");
  if (Result.isError(validateTokenResult)) {
    throw new Error(validateTokenResult.message);
  }

  const headers = new HeaderBuilder().acceptJson().build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateFormIdResult.value}/submissions/by-token/${validateTokenResult.value}`,
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch submission");
  }

  return response.json();
};

export const getSubmission = async (
  formId: string,
  submissionId: string,
): Promise<Submission> => {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new Error(validateSubmissionIdResult.message);
  }

  const headers = new HeaderBuilder().withAuth(session).acceptJson().build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${validateFormIdResult.value}/submissions/${validateSubmissionIdResult.value}`,
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch submission");
  }

  return response.json();
};

export const getSubmissionFiles = async (
  formId: string,
  submissionId: string,
  fileNamesPrefix?: string,
): Promise<Response> => {
  const session = await getSession();

  if (!session?.isLoggedIn) {
    redirect("/login");
  }
  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new Error(validateSubmissionIdResult.message);
  }

  const headers = new HeaderBuilder().withAuth(session).provideJson().build();

  const requestUrl = `${API_BASE_URL}/forms/${validateFormIdResult.value}/submissions/${validateSubmissionIdResult.value}/files`;
  const requestBody = fileNamesPrefix ? { fileNamesPrefix } : {};

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = "Failed to download submission files";
    if (response.status === 400) {
      const error = await response.json();

      // Extract fileNamesPrefix error if present
      const fileNamesPrefixError =
        error?.errors?.fileNamesPrefix?.length > 0
          ? error.errors.fileNamesPrefix.join(", ")
          : undefined;

      // Use the extracted error or fallback to the general message
      errorMessage = fileNamesPrefixError || error.message || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return response;
};

export interface ExportOptions {
  formId: string;
  format?: string;
  exportId?: string;
}

/**
 * Exports form submissions in the specified format (CSV, JSON, etc.)
 * Returns a streaming response for direct download
 */
export const exportSubmissions = async (
  options: ExportOptions,
): Promise<Response> => {
  const { formId, format = "csv", exportId } = options;

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new Error(validateFormIdResult.message);
  }

  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const apiUrl = `${API_BASE_URL}/forms/${validateFormIdResult.value}/submissions/export`;

  // Create a transform stream to handle the data flow
  const { readable, writable } = new TransformStream();

  // Default content type based on format
  let contentType = "text/csv";
  let contentDisposition = `attachment; filename=form-${formId}-submissions.csv`;

  if (format === "json") {
    contentType = "application/json";
    contentDisposition = `attachment; filename=form-${formId}-submissions.json`;
  }

  // Create an AbortController to handle client disconnection
  const abortController = new AbortController();

  // Process the API response in the background
  (async () => {
    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
    try {
      const headers = new HeaderBuilder()
        .withAuth(session)
        .provideJson()
        .build();

      const exportRequest: { exportFormat: string; exportId?: string } = {
        exportFormat: format,
      };

      if (exportId) {
        exportRequest.exportId = exportId;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(exportRequest),
        signal: abortController.signal,
      });

      if (!response.ok) {
        writer = writable.getWriter();
        try {
          const errorBody = await response.json();
          await writer.write(
            new TextEncoder().encode(
              JSON.stringify({
                error: errorBody.Detail || "Export failed",
                status: response.status,
                statusText: response.statusText,
              }),
            ),
          );
        } finally {
          await writer.close();
        }
        return;
      }

      // Update content disposition and type from response headers if available
      const responseContentDisposition = response.headers.get(
        "Content-Disposition",
      );
      if (responseContentDisposition) {
        contentDisposition = responseContentDisposition;
      }

      const responseContentType = response.headers.get("Content-Type");
      if (responseContentType) {
        contentType = responseContentType;
      }

      // Pipe the response body directly to our writable stream
      if (response.body) {
        await response.body.pipeTo(writable, {
          signal: abortController.signal,
        });
      } else {
        writer = writable.getWriter();
        try {
          await writer.write(
            new TextEncoder().encode("No data returned from API"),
          );
        } finally {
          await writer.close();
        }
      }
    } catch (error) {
      // Only write error if stream is still open and not aborted
      if (
        error instanceof Error &&
        error.name !== "AbortError" &&
        !abortController.signal.aborted
      ) {
        try {
          writer = writable.getWriter();
          await writer.write(
            new TextEncoder().encode(
              JSON.stringify({
                error: "Failed to export data",
                message: error.message,
              }),
            ),
          );
          await writer.close();
        } catch {
          // Stream may already be closed, ignore
        }
      } else if (error instanceof Error && error.name === "AbortError") {
        // Client disconnected - abort the writable stream to clean up
        try {
          writer = writable.getWriter();
          await writer.abort();
        } catch {
          // Ignore errors during abort cleanup
        }
      }
    }
  })();

  // Create a custom ReadableStream that aborts the fetch when cancelled
  // This ensures proper cleanup of HTTP connections when the client disconnects
  let streamReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  const cancellableReadable = new ReadableStream({
    start(controller) {
      // Pipe data from the transform stream's readable
      streamReader = readable.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await streamReader!.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            controller.error(error);
          } else {
            controller.close();
          }
        } finally {
          if (streamReader) {
            streamReader.releaseLock();
            streamReader = null;
          }
        }
      };
      pump();
    },
    cancel(reason) {
      // When the client cancels, abort the fetch to clean up the connection
      abortController.abort();
      // Cancel the reader if it exists
      if (streamReader) {
        streamReader.cancel(reason).catch(() => {
          // Ignore cancellation errors
        });
      }
      // Also cancel the original readable stream
      readable.cancel(reason).catch(() => {
        // Ignore cancellation errors
      });
    },
  });

  // Return the response with the cancellable readable stream
  return new Response(cancellableReadable, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
    },
  });
};

export interface CustomQuestion {
  id: string;
  name: string;
  description: string | null;
  jsonData: string;
  createdAt: string;
  modifiedAt: string | null;
}

export const getCustomQuestions = async (): Promise<CustomQuestion[]> => {
  const session = await getSession();
  const headers = new HeaderBuilder().withAuth(session).build();

  const response = await fetch(`${API_BASE_URL}/questions`, {
    headers: headers,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch custom questions");
  }

  return response.json();
};

export interface CreateCustomQuestionRequest {
  name: string;
  description?: string;
  jsonData: string;
}

export const createCustomQuestion = async (
  request: CreateCustomQuestionRequest,
): Promise<CustomQuestion> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(`${API_BASE_URL}/questions`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Failed to create custom question");
  }

  return response.json();
};

export interface RegistrationRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

// Actual API response type - the API returns a string (user ID)
export type VerifyEmailApiResponse = string;

export interface SendVerificationRequest {
  email: string;
}

// Actual API response type - the API returns a string message
export type SendVerificationApiResponse = string;

export const sendVerification = async (
  request: SendVerificationRequest,
): Promise<SendVerificationApiResponse> => {
  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const response = await fetch(`${API_BASE_URL}/auth/send-verification-email`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.title || "Failed to send verification email");
  }

  return response.json();
};

export const verifyEmail = async (
  request: VerifyEmailRequest,
): Promise<VerifyEmailApiResponse> => {
  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = "Failed to verify email";

    try {
      const error = await response.json();
      errorMessage = error.title || errorMessage;
    } catch {
      // If response body is empty or not JSON, use status-based message
      if (response.status === 404) {
        errorMessage = "Invalid verification token";
      } else if (response.status === 400) {
        errorMessage = "Invalid verification request";
      } else if (response.status >= 500) {
        errorMessage = "Server error occurred while verifying email";
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
};

export const register = async (
  request: RegistrationRequest,
): Promise<RegistrationResponse> => {
  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.title || "Failed to register");
  }

  return response.json();
};
