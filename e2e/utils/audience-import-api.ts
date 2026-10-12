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

export type PanelImport = {
  api: EndatixApi;
  formId: string;
  result: AudienceImportResult;
};

export function panelCsv(fileName: string): string {
  return readFileSync(path.join(FIXTURES, fileName), "utf8");
}

export async function signInForAudience(): Promise<EndatixApi | undefined> {
  if (!e2eCredentials()) {
    return undefined;
  }
  return signInE2eApi();
}

export async function importPanelCsv(
  api: EndatixApi,
  formName: string,
  fileName: string,
): Promise<PanelImport> {
  const formId = await createForm(api, formName);
  try {
    await switchMatchKeyToExternalId(api);
    const csvText = panelCsv(fileName);
    const headers = csvText.split(/\r?\n/, 1)[0]?.split(",") ?? [];
    await createColumns(api, formId, headers);
    const imported = await api.audience.importCsv(formId, {
      csvText,
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
    return { api, formId, result: imported.data };
  } catch (error) {
    await deleteForm(api, formId);
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

async function switchMatchKeyToExternalId(api: EndatixApi): Promise<void> {
  const updated = await api.audience.updateSettings({
    identifierKind: AudienceIdentifierKind.ExternalId,
  });
  if (!updated.success) {
    throw new Error(
      `Match key must be external id for ${IDENTIFIER_COLUMN}. ${updated.error.message}`,
    );
  }
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
