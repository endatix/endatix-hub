import { readFileSync } from "node:fs";
import path from "node:path";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceImportResult,
} from "@/lib/endatix-api/audience/types";
import { deleteForm, e2eCredentials, signInE2eApi } from "./screen-out-api";

const FIXTURES = path.join(process.cwd(), "e2e/fixtures/audience");

const NUMBER_HEADERS = new Set([
  "iddomicilio",
  "NSE_LOC",
  "edac",
  "ni",
  "idPainel",
]);

export type PanelImport = {
  api: EndatixApi;
  formId: string;
  result: AudienceImportResult;
};

export function panelCsv(fileName: string): string {
  return readFileSync(path.join(FIXTURES, fileName), "utf8");
}

export function slugifyPropertyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
    await useExternalId(api);
    const csvText = panelCsv(fileName);
    const headers = csvText.split(/\r?\n/, 1)[0]?.split(",") ?? [];
    await createColumns(api, formId, headers);
    const imported = await api.audience.importCsv(formId, {
      csvText,
      identifierColumn: "businessid",
      fileName,
      propertyColumns: Object.fromEntries(
        headers
          .filter((header) => header !== "businessid")
          .map((header) => [slugifyPropertyName(header), header]),
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

async function useExternalId(api: EndatixApi): Promise<void> {
  const updated = await api.audience.updateSettings({
    identifierKind: AudienceIdentifierKind.ExternalId,
  });
  if (!updated.success) {
    throw new Error(
      `Match key must be external id for businessid. ${updated.error.message}`,
    );
  }
}

async function createColumns(
  api: EndatixApi,
  formId: string,
  headers: string[],
): Promise<void> {
  for (const header of headers) {
    if (header === "businessid") {
      continue;
    }
    const created = await api.audience.createProperty(formId, {
      name: header,
      dataType: NUMBER_HEADERS.has(header)
        ? AudienceDataType.Number
        : AudienceDataType.Text,
    });
    if (!created.success) {
      throw new Error(`Create property ${header} failed: ${created.error.message}`);
    }
  }
}
