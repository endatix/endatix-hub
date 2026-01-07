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
    throw new TypeError(validateIdResult.message);
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
    throw new TypeError(validateIdResult.message);
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
    throw new TypeError(validatedIdResult.message);
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
    throw new TypeError(validateIdResult.message);
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
  const requestOptions: RequestInit = {};
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const validateFormIdResult = validateEndatixId(formId, "formId");
  if (Result.isError(validateFormIdResult)) {
    throw new TypeError(validateFormIdResult.message);
  }

  const validateDefinitionIdResult = validateEndatixId(
    definitionId,
    "definitionId",
  );
  if (Result.isError(validateDefinitionIdResult)) {
    throw new TypeError(validateDefinitionIdResult.message);
  }

  const headers = new HeaderBuilder().withAuth(session).build();
  requestOptions.headers = headers;

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
    throw new TypeError(validateFormIdResult.message);
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
    throw new TypeError(validateIdResult.message);
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
    throw new TypeError(validateThemeIdResult.message);
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
    throw new TypeError(validateTemplateIdResult.message);
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
    throw new TypeError(validateTemplateIdResult.message);
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
    throw new TypeError(validateTemplateIdResult.message);
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
    throw new TypeError(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new TypeError(validateSubmissionIdResult.message);
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
    throw new TypeError(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new TypeError(validateSubmissionIdResult.message);
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
    throw new TypeError(validateFormIdResult.message);
  }

  const validateTokenResult = validateHexToken(token, "token");
  if (Result.isError(validateTokenResult)) {
    throw new TypeError(validateTokenResult.message);
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
    throw new TypeError(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new TypeError(validateSubmissionIdResult.message);
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
    throw new TypeError(validateFormIdResult.message);
  }

  const validateSubmissionIdResult = validateEndatixId(
    submissionId,
    "submissionId",
  );
  if (Result.isError(validateSubmissionIdResult)) {
    throw new TypeError(validateSubmissionIdResult.message);
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
