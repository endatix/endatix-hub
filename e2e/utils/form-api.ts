import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { releaseScreenOutForms } from "./e2e-form-release";

/** Visibility and one-per-user for an e2e form. Public and one-per-user do not combine. */
export type E2eFormSetup = {
  isPublic: boolean;
  limitOnePerUser: boolean;
  submissionTokenExpiryHours?: number;
};

export type PublishE2eFormOptions = E2eFormSetup & {
  name: string;
  definitionJson: string;
};

/**
 * Creates a form, publishes its definition, and applies visibility / one-per-user. On failure,
 * keeps the form and records its id for inspection (same as other e2e setup failures).
 */
export async function publishE2eForm(
  api: EndatixApi,
  options: PublishE2eFormOptions,
): Promise<string> {
  const created = await api.forms.create({
    name: options.name,
    isEnabled: true,
    formDefinitionJsonData: "{}",
  });
  if (!created.success) {
    throw new Error(`Create form failed: ${created.error.message}`);
  }

  const formId = created.data.id;
  try {
    await configureE2eForm(api, formId, options);
    return formId;
  } catch (error) {
    await releaseScreenOutForms(api, [formId], true);
    throw error;
  }
}

/**
 * Publishes a definition and applies visibility / one-per-user on an existing form (for example
 * after audience properties were created on an empty form).
 */
export async function configureE2eForm(
  api: EndatixApi,
  formId: string,
  options: E2eFormSetup & { definitionJson: string },
): Promise<void> {
  const published = await api.put(`/forms/${formId}/definition`, {
    isDraft: false,
    jsonData: options.definitionJson,
  });
  if (!published.success) {
    throw new Error(`Publish definition failed: ${published.error.message}`);
  }

  const updated = await api.forms.update(formId, {
    isPublic: options.isPublic,
    limitOnePerUser: options.limitOnePerUser,
    ...(options.submissionTokenExpiryHours !== undefined
      ? { submissionTokenExpiryHours: options.submissionTokenExpiryHours }
      : {}),
  });
  if (!updated.success) {
    throw new Error(`Update form failed: ${updated.error.message}`);
  }
}
