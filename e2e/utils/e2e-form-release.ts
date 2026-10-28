import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";

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
