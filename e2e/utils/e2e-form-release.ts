import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";

/** Playwright default. Vitest sets E2E_KEPT_FORMS_PATH so parallel files do not share this ledger. */
function keptFormsPath(): string {
  const override = process.env.E2E_KEPT_FORMS_PATH;
  if (override) {
    return override;
  }
  return path.join(process.cwd(), "e2e/.screen-out-kept.json");
}

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
export async function releaseE2eForms(
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
    keptFormsPath(),
    JSON.stringify(
      [...prior, ...formIds.map((formId) => ({ formId, recordedAt }))],
      null,
      2,
    ),
  );
  return "kept";
}

function readKeptForms(): { formId: string; recordedAt: string }[] {
  const ledgerPath = keptFormsPath();
  try {
    return JSON.parse(readFileSync(ledgerPath, "utf8")) as {
      formId: string;
      recordedAt: string;
    }[];
  } catch {
    mkdirSync(path.dirname(ledgerPath), { recursive: true });
    return [];
  }
}
