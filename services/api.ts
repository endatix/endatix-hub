import {
  AuthenticationRequest,
  AuthenticationResponse,
  getSession,
} from "@/features/auth";
import { SubmissionData } from "@/features/public-form/application/actions/submit-form.action";
import {
  CreateFormRequest,
  CreateFormTemplateRequest,
  CreateFormTemplateResult,
} from "@/lib/form-types";
import { redirect } from "next/navigation";
import { ITheme } from "survey-core";
import {
  ActiveDefinition,
  Form,
  FormDefinition,
  FormTemplate,
  Submission,
} from "../types";
import { HeaderBuilder } from "./header-builder";
const API_BASE_URL = `${process.env.ENDATIX_BASE_URL}/api`;

export const authenticate = async (
  request: AuthenticationRequest,
): Promise<AuthenticationResponse> => {
  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
};

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

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch form");
  }

  return response.json();
};

export const updateForm = async (
  formId: string,
  data: { name?: string; isEnabled?: boolean; themeId?: string },
): Promise<void> => {
  const session = await getSession();
  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(`${API_BASE_URL}/forms/${formId}`, {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to update form");
  }
};

export const deleteForm = async (formId: string): Promise<string> => {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder().withAuth(session).build();

  const response = await fetch(`${API_BASE_URL}/forms/${formId}`, {
    method: "DELETE",
    headers: headers,
  });

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

  requestOptions.headers = headerBuilder.build();
  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/definition`,
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

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/definitions/${definitionId}`,
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

  const response = await fetch(`${API_BASE_URL}/forms/${formId}/definition`, {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify({ isDraft, jsonData }),
  });

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

  const response = await fetch(`${API_BASE_URL}/themes/${themeId}`, {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify({ jsonData: JSON.stringify(theme) }),
  });

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

  const response = await fetch(`${API_BASE_URL}/themes/${themeId}`, {
    method: "DELETE",
    headers: headers,
  });

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

  const response = await fetch(`${API_BASE_URL}/form-templates/${templateId}`, {
    headers: headers,
  });

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

  const response = await fetch(`${API_BASE_URL}/form-templates/${templateId}`, {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify(data),
  });

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

  const response = await fetch(`${API_BASE_URL}/form-templates/${templateId}`, {
    method: "DELETE",
    headers: headers,
  });

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

export const createSubmissionPublic = async (
  formId: string,
  submissionData: SubmissionData,
): Promise<Submission> => {
  if (!formId) {
    throw new Error("FormId is required");
  }

  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const requestOptions: RequestInit = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(submissionData),
  };

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error("Failed to submit response");
  }

  return response.json();
};

export const updateSubmissionPublic = async (
  formId: string,
  token: string,
  submissionData: SubmissionData,
): Promise<Submission> => {
  if (!formId || !token) {
    throw new Error("FormId or token is required");
  }

  const headers = new HeaderBuilder().acceptJson().provideJson().build();

  const requestOptions: RequestInit = {
    method: "PATCH",
    headers: headers,
    body: JSON.stringify(submissionData),
  };

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions/by-token/${token}`,
    requestOptions,
  );

  if (!response.ok) {
    throw new Error("Failed to submit response");
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

  if (!formId || !submissionId) {
    throw new Error("FormId or submissionId is required");
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions/${submissionId}`,
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

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions/${submissionId}/status`,
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ status }),
    },
  );
  console.log("Status", status);
  if (!response.ok) {
    throw new Error("Failed to change submission status");
  }

  return response.json();
};

export const getPartialSubmissionPublic = async (
  formId: string,
  token: string,
): Promise<Submission> => {
  if (!formId || !token) {
    throw new Error("FormId or token is required");
  }

  const headers = new HeaderBuilder().acceptJson().build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions/by-token/${token}`,
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
  if (!formId || !submissionId) {
    throw new Error("FormId or submissionId is required");
  }

  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder().withAuth(session).acceptJson().build();

  const response = await fetch(
    `${API_BASE_URL}/forms/${formId}/submissions/${submissionId}`,
    {
      headers: headers,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch submission");
  }

  return response.json();
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<string> => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new Error(
      "Current password, new password or confirm password is required",
    );
  }

  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const headers = new HeaderBuilder()
    .withAuth(session)
    .acceptJson()
    .provideJson()
    .build();

  const response = await fetch(`${API_BASE_URL}/my-account/change-password`, {
    method: "POST",
    headers: headers,
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  if (!response.ok) {
    throw new Error("Failed to change password");
  }

  return response.json();
};

/**
 * Exports form submissions in the specified format (CSV, JSON, etc.)
 * Returns a streaming response for direct download
 */
export const exportSubmissions = async (
  formId: string,
  format: string = "csv",
): Promise<Response> => {
  if (!formId) {
    throw new Error("FormId is required");
  }

  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const apiUrl = `${API_BASE_URL}/forms/${formId}/submissions/export`;

  // Create a transform stream to handle the data flow
  const { readable, writable } = new TransformStream();

  // Default content type based on format
  let contentType = "text/csv";
  let contentDisposition = `attachment; filename=form-${formId}-submissions.csv`;

  if (format === "json") {
    contentType = "application/json";
    contentDisposition = `attachment; filename=form-${formId}-submissions.json`;
  }

  // Process the API response in the background
  (async () => {
    try {
      const headers = new HeaderBuilder()
        .withAuth(session)
        .provideJson()
        .build();
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          exportFormat: format,
        }),
      });

      if (!response.ok) {
        const writer = writable.getWriter();
        const errorBody = await response.json();
        writer.write(
          new TextEncoder().encode(
            JSON.stringify({
              error: errorBody.Detail || "Export failed",
              status: response.status,
              statusText: response.statusText,
            }),
          ),
        );
        writer.close();
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
        await response.body.pipeTo(writable);
      } else {
        const writer = writable.getWriter();
        writer.write(new TextEncoder().encode("No data returned from API"));
        writer.close();
      }
    } catch (error) {
      const writer = writable.getWriter();
      writer.write(
        new TextEncoder().encode(
          JSON.stringify({
            error: "Failed to export data",
            message: error instanceof Error ? error.message : String(error),
          }),
        ),
      );
      writer.close();
    }
  })();

  // Return the readable stream with appropriate headers
  return new Response(readable, {
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
