import { readFileSync } from "node:fs";
import path from "node:path";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  AudienceDataType,
  AudienceIdentifierKind,
  type AudienceImportResult,
} from "@/lib/endatix-api/audience/types";
import { variableNameFromName } from "@/features/audience/property-types";
import {
  configureE2eForm,
  type E2eFormSetup,
} from "./form-api";
import {
  e2eCredentials,
  releaseScreenOutForms,
  signInE2eApi,
} from "./screen-out-api";

export type { E2eFormSetup } from "./form-api";

/** Private one-per-user: the default sandbox for personalized-link and on-behalf e2e. */
export const PRIVATE_ONE_PER_USER: E2eFormSetup = {
  isPublic: false,
  limitOnePerUser: true,
  submissionTokenExpiryHours: 24,
};

const FIXTURES = path.join(process.cwd(), "e2e/fixtures/audience");

const NUMBER_HEADERS = new Set([
  "household_id",
  "ses_local",
  "age",
  "household_size",
  "panel_id",
]);

const IDENTIFIER_COLUMN = "external_id";

const CHOICE_SEPARATOR = "__";

/** One Audience property to create before import. */
export type PanelPropertySpec = {
  name: string;
  dataType: AudienceDataType;
  choicesJson?: string;
};

/** A form with a property per fixture column, under the external id match key. */
export type PanelForm = {
  api: EndatixApi;
  formId: string;
  /** Deletes the form, then puts back the tenant match key the test found. */
  cleanup: () => Promise<void>;
  /**
   * Deletes on success. On keep, leaves the form and records its id. Always restores the match
   * key.
   */
  release: (keep: boolean) => Promise<"deleted" | "kept">;
};

export type PanelImport = PanelForm & { result: AudienceImportResult };

export const ALL_QUESTIONS_CSV = "all-questions-personalized-audience.csv";
export const ALL_QUESTIONS_DEFINITION =
  "all-questions-personalized-definition.json";

/** Properties for the all-questions personalized form. Choice columns are not listed here. */
export const ALL_QUESTIONS_PROPERTIES: readonly PanelPropertySpec[] = [
  { name: "full_name", dataType: AudienceDataType.Text },
  { name: "age", dataType: AudienceDataType.Number },
  { name: "hometown", dataType: AudienceDataType.Text },
  { name: "panel_member", dataType: AudienceDataType.Boolean },
  { name: "joined", dataType: AudienceDataType.Date },
  { name: "last_seen", dataType: AudienceDataType.DateTime },
  {
    name: "tags",
    dataType: AudienceDataType.MultipleChoice,
    choicesJson: '["sports","music","travel","food"]',
  },
];

export function panelCsv(fileName: string): string {
  return readFileSync(path.join(FIXTURES, fileName), "utf8");
}

export function panelDefinition(fileName: string): string {
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
  properties?: readonly PanelPropertySpec[],
): Promise<PanelForm> {
  const specs =
    properties ?? inferredProperties(panelCsvHeaders(fileName));
  return preparePanelFormWithProperties(api, formName, specs);
}

export async function preparePanelFormWithProperties(
  api: EndatixApi,
  formName: string,
  properties: readonly PanelPropertySpec[],
): Promise<PanelForm> {
  const formId = await createForm(api, formName);
  let restoreMatchKey: () => Promise<void> = async () => {};
  const release = async (keep: boolean): Promise<"deleted" | "kept"> => {
    try {
      return await releaseScreenOutForms(api, [formId], keep);
    } finally {
      await restoreMatchKey();
    }
  };
  const cleanup = async () => {
    await release(false);
  };
  try {
    restoreMatchKey = await switchMatchKeyToExternalId(api);
    await createProperties(api, formId, properties);
    return { api, formId, cleanup, release };
  } catch (error) {
    await release(true);
    throw error;
  }
}

/** Imports the fixture through the API, every simple column mapped to its property. */
export async function importPanelCsv(
  api: EndatixApi,
  formName: string,
  fileName: string,
  properties?: readonly PanelPropertySpec[],
): Promise<PanelImport> {
  const headers = panelCsvHeaders(fileName);
  const specs = properties ?? inferredProperties(headers);
  const form = await preparePanelFormWithProperties(api, formName, specs);
  try {
    const result = await importCsvOntoForm(api, form.formId, fileName, specs);
    return { ...form, result };
  } catch (error) {
    await form.release(true);
    throw error;
  }
}

/**
 * All-questions form: properties created, definition published with the given setup, CSV
 * imported.
 */
export async function seedAllQuestionsForm(
  api: EndatixApi,
  setup: E2eFormSetup = PRIVATE_ONE_PER_USER,
  formName = "All questions personalization",
): Promise<PanelForm> {
  const form = await preparePanelFormWithProperties(
    api,
    formName,
    ALL_QUESTIONS_PROPERTIES,
  );
  try {
    await configureE2eForm(api, form.formId, {
      definitionJson: panelDefinition(ALL_QUESTIONS_DEFINITION),
      ...setup,
    });
    await importCsvOntoForm(
      api,
      form.formId,
      ALL_QUESTIONS_CSV,
      ALL_QUESTIONS_PROPERTIES,
    );
    return form;
  } catch (error) {
    await form.release(true);
    throw error;
  }
}

export async function importCsvOntoForm(
  api: EndatixApi,
  formId: string,
  fileName: string,
  properties: readonly PanelPropertySpec[],
): Promise<AudienceImportResult> {
  const headers = panelCsvHeaders(fileName);
  const imported = await api.audience.importCsv(formId, {
    csvText: panelCsv(fileName),
    identifierColumn: IDENTIFIER_COLUMN,
    fileName,
    propertyColumns: simplePropertyColumns(headers, properties),
  });
  if (!imported.success) {
    throw new Error(`Import failed: ${imported.error.message}`);
  }
  return imported.data;
}

function inferredProperties(headers: string[]): PanelPropertySpec[] {
  return headers
    .filter((header) => header !== IDENTIFIER_COLUMN)
    .map((header) => ({
      name: header,
      dataType: NUMBER_HEADERS.has(header)
        ? AudienceDataType.Number
        : AudienceDataType.Text,
    }));
}

function isChoiceType(dataType: AudienceDataType): boolean {
  return (
    dataType === AudienceDataType.SingleChoice ||
    dataType === AudienceDataType.MultipleChoice
  );
}

/** Simple columns only. `variable__choice` headers are read by the API from the file. */
function simplePropertyColumns(
  headers: string[],
  properties: readonly PanelPropertySpec[],
): Record<string, string> {
  const choicePrefixes = properties
    .filter((property) => isChoiceType(property.dataType))
    .map(
      (property) =>
        `${variableNameFromName(property.name)}${CHOICE_SEPARATOR}`.toLowerCase(),
    );
  return Object.fromEntries(
    headers
      .filter((header) => header !== IDENTIFIER_COLUMN)
      .filter(
        (header) =>
          !choicePrefixes.some((prefix) =>
            header.toLowerCase().startsWith(prefix),
          ),
      )
      .map((header) => [variableNameFromName(header), header]),
  );
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

async function createProperty(
  api: EndatixApi,
  formId: string,
  property: PanelPropertySpec,
): Promise<void> {
  const created = await api.audience.createProperty(formId, {
    name: property.name,
    dataType: property.dataType,
    choicesJson: property.choicesJson,
  });
  if (!created.success) {
    throw new Error(
      `Create property ${property.name} failed: ${created.error.message}`,
    );
  }
}

async function createProperties(
  api: EndatixApi,
  formId: string,
  properties: readonly PanelPropertySpec[],
): Promise<void> {
  await Promise.all(
    properties.map((property) => createProperty(api, formId, property)),
  );
}
