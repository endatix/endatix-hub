import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { publishE2eForm } from "./form-api";
import { createOnBehalfShare } from "./on-behalf-share";

export { deleteForm, releaseE2eForms } from "./e2e-form-release";
export { createOnBehalf, createShareAccessToken } from "./on-behalf-share";

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
  return publishE2eForm(api, {
    name: `e2e screen-out ${Date.now()}`,
    definitionJson: ageGateJson(options.changeNavigationOnComplete),
    isPublic: options.isPublic,
    limitOnePerUser: options.limitOnePerUser,
  });
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
  const submitterId = `e2e-${formId}`;
  const submission = await createOnBehalfShare(api, formId, submitterId);
  return { api, formId, submitterId, ...submission };
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
