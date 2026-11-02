import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { releaseE2eForms } from "./e2e-form-release";

export type OnBehalfShare = {
  submissionId: string;
  /** Hex continuation token from on-behalf create. */
  token: string;
  /** Access token with `submit`, used in share and embed URLs. */
  shareToken: string;
};

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

/** On-behalf submission plus a share token. A failure keeps the form and rethrows. */
export async function createOnBehalfShare(
  api: EndatixApi,
  formId: string,
  submitterId: string,
): Promise<OnBehalfShare> {
  try {
    const submission = await createOnBehalf(api, formId, submitterId);
    const shareToken = await createShareAccessToken(
      api,
      formId,
      submission.submissionId,
    );
    return { ...submission, shareToken };
  } catch (error) {
    await releaseE2eForms(api, [formId], true);
    throw error;
  }
}
