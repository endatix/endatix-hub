import { readFileSync } from "node:fs";
import path from "node:path";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceImportResult,
} from "@/lib/endatix-api/audience/types";
import { variableNameFromName } from "@/features/audience/property-types";
import { deleteForm, e2eCredentials, signInE2eApi } from "./screen-out-api";

const FIXTURES = path.join(process.cwd(), "e2e/fixtures/audience");

const NUMBER_HEADERS = new Set([
  "household_id",
  "ses_local",
  "age",
  "household_size",
  "panel_id",
]);

const IDENTIFIER_COLUMN = "external_id";

/** A form with a property per fixture column, under the external id match key. */
export type PanelForm = {
  api: EndatixApi;
  formId: string;
  /** Deletes the form, then puts back the tenant match key the test found. */
  cleanup: () => Promise<void>;
};

export type PanelImport = PanelForm & { result: AudienceImportResult };

export function panelCsv(fileName: string): string {
  return readFileSync(path.join(FIXTURES, fileName), "utf8");
}

export async function signInForAudience(): Promise<EndatixApi | undefined> {
  if (!e2eCredentials()) {
    return undefined;
  }
  return signInE2eApi();
}

/** The fixture's header cells; the fixtures quote no header. */
export function panelCsvHeaders(fileName: string): string[] {
  return panelCsv(fileName).split(/\r?\n/, 1)[0]?.split(",") ?? [];
}

/**
 * Creates the form, switches the tenant to the external id match key and adds a property per
 * column. Cleanup deletes the form and restores the match key it found.
 */
export async function preparePanelForm(
  api: EndatixApi,
  formName: string,
  fileName: string,
): Promise<PanelForm> {
  const formId = await createForm(api, formName);
  let restoreMatchKey: () => Promise<void> = async () => {};
  const cleanup = async () => {
    try {
      await deleteForm(api, formId);
    } finally {
      await restoreMatchKey();
    }
  };
  try {
    restoreMatchKey = await switchMatchKeyToExternalId(api);
    await createColumns(api, formId, panelCsvHeaders(fileName));
    return { api, formId, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

/** Imports the fixture through the API, every column mapped to its property. */
export async function importPanelCsv(
  api: EndatixApi,
  formName: string,
  fileName: string,
): Promise<PanelImport> {
  const form = await preparePanelForm(api, formName, fileName);
  try {
    const headers = panelCsvHeaders(fileName);
    const imported = await api.audience.importCsv(form.formId, {
      csvText: panelCsv(fileName),
      identifierColumn: IDENTIFIER_COLUMN,
      fileName,
      propertyColumns: Object.fromEntries(
        headers
          .filter((header) => header !== IDENTIFIER_COLUMN)
          .map((header) => [variableNameFromName(header), header]),
      ),
    });
    if (!imported.success) {
      throw new Error(`Import failed: ${imported.error.message}`);
    }
    return { ...form, result: imported.data };
  } catch (error) {
    await form.cleanup();
    throw error;
  }
}

async function createForm(api: EndatixApi, name: string): Promise<string> {
  const created = await api.forms.create({
    name: `${name} ${Date.now()}`,
    isEnabled: true,
    formDefinitionJsonData: "{}",
  });
  if (!created.success) {
    throw new Error(`Create form failed: ${created.error.message}`);
  }
  return created.data.id;
}

/**
 * The match key is tenant-wide, so the switch returns a restore that puts back the value it
 * found. Restoring is best effort: a tenant that still has people keeps its key locked.
 */
async function switchMatchKeyToExternalId(
  api: EndatixApi,
): Promise<() => Promise<void>> {
  const current = await api.audience.getSettings();
  if (!current.success) {
    throw new Error(`Read audience settings failed: ${current.error.message}`);
  }
  const previous = current.data.identifierKind;
  if (previous === AudienceIdentifierKind.ExternalId) return async () => {};
  const updated = await api.audience.updateSettings({
    identifierKind: AudienceIdentifierKind.ExternalId,
  });
  if (!updated.success) {
    throw new Error(
      `Match key must be external id for ${IDENTIFIER_COLUMN}. ${updated.error.message}`,
    );
  }
  return async () => {
    await api.audience.updateSettings({ identifierKind: previous });
  };
}

async function createColumn(
  api: EndatixApi,
  formId: string,
  header: string,
): Promise<void> {
  const created = await api.audience.createProperty(formId, {
    name: header,
    dataType: NUMBER_HEADERS.has(header)
      ? AudienceDataType.Number
      : AudienceDataType.Text,
  });
  if (!created.success) {
    throw new Error(
      `Create property ${header} failed: ${created.error.message}`,
    );
  }
}

async function createColumns(
  api: EndatixApi,
  formId: string,
  headers: string[],
): Promise<void> {
  await Promise.all(
    headers
      .filter((header) => header !== IDENTIFIER_COLUMN)
      .map((header) => createColumn(api, formId, header)),
  );
}
