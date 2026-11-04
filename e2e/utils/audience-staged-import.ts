import { readFileSync } from "node:fs";
import path from "node:path";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import type { ApiResult } from "@/lib/endatix-api/shared/api-result";
import {
  AudienceImportStatus,
  type AudienceImportOptions,
  type AudienceImportRejectedRow,
  type AudienceImportView,
} from "@/lib/endatix-api/audience/types";
import { importChunk } from "@/features/audience/import-csv/import-run";
import { readCsvRows } from "@/lib/utils/csv";
import {
  IDENTIFIER_COLUMN,
  simplePropertyColumns,
  type PanelPropertySpec,
} from "./audience-import-api";

const DEMO = path.join(process.cwd(), "e2e/fixtures/audience/demo");
const POLL_MS = 250;
const POLL_LIMIT_MS = 60_000;

export const DEMO_CSV = "acme-demo.csv";
export const DEMO_UPDATE_CSV = "acme-demo-update.csv";

export function demoFile(fileName: string): string {
  return readFileSync(path.join(DEMO, fileName), "utf8");
}

/** The demo Properties, as `generate.mjs` writes them. */
export function demoProperties(): PanelPropertySpec[] {
  return JSON.parse(demoFile("acme-demo.properties.json"));
}

/** A finished staged import, and the rows it did not write. */
export type StagedImport = {
  view: AudienceImportView;
  rejectedRows: readonly AudienceImportRejectedRow[];
};

function unwrap<T>(result: ApiResult<T>, what: string): T {
  if (!result.success)
    throw new Error(`${what} failed: ${result.error.message}`);
  return result.data;
}

/** The form a demo file is imported onto, and the Properties its columns map to. */
export type DemoImportTarget = {
  api: EndatixApi;
  formId: string;
  properties: readonly PanelPropertySpec[];
};

async function waitWhile(
  { api, formId }: DemoImportTarget,
  view: AudienceImportView,
  statuses: readonly string[],
): Promise<AudienceImportView> {
  const deadline = Date.now() + POLL_LIMIT_MS;
  let latest = view;
  while (statuses.includes(latest.status)) {
    if (Date.now() > deadline) {
      throw new Error(`Import ${latest.importId} is still ${latest.status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    latest = unwrap(
      await api.audience.getImport(formId, latest.importId),
      "Read import",
    );
  }
  return latest;
}

/** Starts the import with the overwrite rules and sends every chunk of the file. */
async function upload(
  { api, formId, properties }: DemoImportTarget,
  fileName: string,
  options: AudienceImportOptions,
): Promise<AudienceImportView> {
  const [header, ...rows] = readCsvRows(demoFile(fileName));
  const headers = header.cells;
  const started = unwrap(
    await api.audience.startImport(formId, {
      fileName,
      headers,
      rowCount: rows.length,
      identifierColumn: IDENTIFIER_COLUMN,
      propertyColumns: simplePropertyColumns(headers, properties),
      isTest: false,
      ...options,
    }),
    "Start import",
  );
  const { chunkSize, missingChunks } = started.upload;
  let view = started;
  for (const index of missingChunks) {
    const chunk = importChunk(rows, {
      index,
      chunkSize,
      columns: headers.length,
    });
    view = unwrap(
      await api.audience.sendImportChunk(formId, started.importId, {
        index,
        ...chunk,
      }),
      `Send chunk ${index}`,
    );
  }
  return view;
}

/**
 * Imports a demo file the way the wizard does: start with the overwrite rules, send the chunks,
 * wait for the Check, confirm, wait for the write. Then reads the first page (50) of rejected rows.
 */
export async function stagedDemoImport(
  target: DemoImportTarget,
  fileName: string,
  options: AudienceImportOptions,
): Promise<StagedImport> {
  const { api, formId } = target;
  let view = await upload(target, fileName, options);
  view = await waitWhile(target, view, [
    AudienceImportStatus.Uploading,
    AudienceImportStatus.Checking,
  ]);
  if (view.status !== AudienceImportStatus.Checked) {
    throw new Error(
      `Import ${view.importId} stopped at ${view.status}: ${view.failure}`,
    );
  }
  view = unwrap(
    await api.audience.moveImport(
      formId,
      view.importId,
      AudienceImportStatus.Writing,
    ),
    "Confirm import",
  );
  view = await waitWhile(target, view, [AudienceImportStatus.Writing]);
  const rejected = unwrap(
    await api.audience.listImportRejections(formId, view.importId, 1),
    "Read rejected rows",
  );
  return { view, rejectedRows: rejected.items };
}
