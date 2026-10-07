import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";

const AGE_GATE_PATH = path.join(
  process.cwd(),
  "lib/survey-features/screen-out/__tests__/fixtures/age-gate.json",
);

export type ScreenOutForm = {
  api: EndatixApi;
  formId: string;
  submissionId: string;
  /** Hex continuation token from on-behalf create. Used for by-token API calls. */
  token: string;
  /** Access token with `submit`, same as Hub "Share" link. Used in share/embed URLs. */
  shareToken: string;
  submitterId: string;
};

export function e2eApiBaseUrl(): string {
  return (
    process.env.E2E_API_URL ??
    process.env.ENDATIX_API_URL ??
    "https://localhost:5001/api"
  );
}

const KEYCHAIN_SERVICE = "endatix-hub-e2e";

export function e2eCredentials():
  | { email: string; password: string }
  | undefined {
  const email = process.env.E2E_EMAIL ?? process.env.SMOKE_TEST_EMAIL;
  const password =
    process.env.E2E_PASSWORD ??
    process.env.SMOKE_TEST_PASSWORD ??
    passwordFromKeychain();
  if (!email || !password) {
    return undefined;
  }
  return { email, password };
}

function passwordFromKeychain(): string | undefined {
  if (process.platform !== "darwin") {
    return undefined;
  }
  try {
    // Absolute path: a PATH lookup could run a planted `security` binary.
    return execFileSync(
      "/usr/bin/security",
      ["find-generic-password", "-a", "e2e", "-s", KEYCHAIN_SERVICE, "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
  } catch {
    return undefined;
  }
}

export async function signInE2eApi(): Promise<EndatixApi> {
  const credentials = e2eCredentials();
  if (!credentials) {
    throw new Error("Set E2E_EMAIL and E2E_PASSWORD (or the SMOKE_TEST pair).");
  }

  const baseUrl = e2eApiBaseUrl();
  const anonymous = new EndatixApi(undefined, { baseUrl });
  const signedIn = await anonymous.auth.signIn(credentials);
  if (!signedIn.success) {
    throw new Error(`API login failed: ${signedIn.error.message}`);
  }

  return new EndatixApi(signedIn.data.accessToken, { baseUrl });
}

export async function createAgeGateForm(
  api: EndatixApi,
  options: {
    isPublic: boolean;
    limitOnePerUser: boolean;
    /** When false, a screen-out trigger keeps Next. Clicking it still ends the survey. */
    changeNavigationOnComplete?: boolean;
  },
): Promise<string> {
  const created = await api.forms.create({
    name: `e2e screen-out ${Date.now()}`,
    isEnabled: true,
    formDefinitionJsonData: "{}",
  });
  if (!created.success) {
    throw new Error(`Create form failed: ${created.error.message}`);
  }

  const formId = created.data.id;
  try {
    const published = await api.put(`/forms/${formId}/definition`, {
      isDraft: false,
      jsonData: ageGateJson(options.changeNavigationOnComplete),
    });
    if (!published.success) {
      throw new Error(`Publish definition failed: ${published.error.message}`);
    }

    const updated = await api.forms.update(formId, {
      isPublic: options.isPublic,
      limitOnePerUser: options.limitOnePerUser,
    });
    if (!updated.success) {
      throw new Error(`Update form failed: ${updated.error.message}`);
    }

    return formId;
  } catch (error) {
    await releaseScreenOutForms(api, [formId], true);
    throw error;
  }
}

export async function createOnBehalf(
  api: EndatixApi,
  formId: string,
  submitterId: string,
): Promise<{ submissionId: string; token: string }> {
  const created = await api.post<{ id: string; token: string }>(
    `/forms/${formId}/submissions/onbehalf`,
    {
      isComplete: false,
      jsonData: "{}",
      submitter: {
        externalSubjectId: submitterId,
        displayId: submitterId,
      },
    },
  );
  if (!created.success) {
    throw new Error(`On-behalf create failed: ${created.error.message}`);
  }

  return { submissionId: created.data.id, token: created.data.token };
}

export async function createShareAccessToken(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<string> {
  const created = await api.submissions.createAccessToken({
    formId,
    submissionId,
    expiryMinutes: 60 * 24 * 7,
    permissions: ["submit"],
  });
  if (!created.success) {
    throw new Error(`Share access token failed: ${created.error.message}`);
  }
  return created.data.token;
}

function ageGateJson(changeNavigationOnComplete: boolean | undefined): string {
  const definition = JSON.parse(readFileSync(AGE_GATE_PATH, "utf8")) as Record<
    string,
    unknown
  >;
  if (changeNavigationOnComplete === false) {
    definition.edxChangeNavigationOnComplete = false;
  }
  return JSON.stringify(definition);
}

export async function seedScreenOutForm(
  api: EndatixApi,
  options: {
    isPublic: boolean;
    limitOnePerUser: boolean;
    changeNavigationOnComplete?: boolean;
  },
): Promise<ScreenOutForm> {
  const formId = await createAgeGateForm(api, options);
  try {
    const submitterId = `e2e-${formId}`;
    const submission = await createOnBehalf(api, formId, submitterId);
    const shareToken = await createShareAccessToken(
      api,
      formId,
      submission.submissionId,
    );
    return { api, formId, submitterId, shareToken, ...submission };
  } catch (error) {
    await releaseScreenOutForms(api, [formId], true);
    throw error;
  }
}

export async function readSubmissionOutcome(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<{ collectionStatus?: string; isComplete: boolean }> {
  const submission = await api.get<{
    collectionStatus?: string;
    isComplete: boolean;
  }>(`/forms/${formId}/submissions/${submissionId}`);
  if (!submission.success) {
    throw new Error(`Read submission failed: ${submission.error.message}`);
  }
  return {
    collectionStatus: submission.data.collectionStatus,
    isComplete: submission.data.isComplete,
  };
}

export async function trySecondOnBehalf(
  api: EndatixApi,
  formId: string,
  submitterId: string,
): Promise<ApiResult<{ id: string }>> {
  return api.post<{ id: string }>(`/forms/${formId}/submissions/onbehalf`, {
    isComplete: false,
    jsonData: "{}",
    submitter: {
      externalSubjectId: submitterId,
      displayId: submitterId,
    },
  });
}

const KEPT_FORMS_PATH = path.join(process.cwd(), "e2e/.screen-out-kept.json");

export async function deleteForm(
  api: EndatixApi,
  formId: string,
): Promise<void> {
  const deleted = await api.forms.delete(formId);
  if (!deleted.success) {
    throw new Error(`Delete form ${formId} failed: ${deleted.error.message}`);
  }
}

/** Delete on success. On failure, or when E2E_KEEP_DATA=1, leave the forms and record their ids. */
export async function releaseScreenOutForms(
  api: EndatixApi,
  formIds: string[],
  keep: boolean,
): Promise<"deleted" | "kept"> {
  if (!keep) {
    await Promise.all(formIds.map((formId) => deleteForm(api, formId)));
    return "deleted";
  }

  const prior = readKeptForms();
  const recordedAt = new Date().toISOString();
  writeFileSync(
    KEPT_FORMS_PATH,
    JSON.stringify(
      [...prior, ...formIds.map((formId) => ({ formId, recordedAt }))],
      null,
      2,
    ),
  );
  return "kept";
}

function readKeptForms(): { formId: string; recordedAt: string }[] {
  try {
    return JSON.parse(readFileSync(KEPT_FORMS_PATH, "utf8")) as {
      formId: string;
      recordedAt: string;
    }[];
  } catch {
    mkdirSync(path.dirname(KEPT_FORMS_PATH), { recursive: true });
    return [];
  }
}
