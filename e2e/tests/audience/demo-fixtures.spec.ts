import { expect, test } from "@playwright/test";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  AudienceImportOption,
  type AudienceImportOptions,
} from "@/lib/endatix-api/audience/types";
import { readCsvRecords } from "@/lib/utils/csv";
import {
  PRIVATE_ONE_PER_USER,
  preparePanelFormWithProperties,
  signInForAudience,
  type PanelForm,
} from "../../utils/audience-import-api";
import {
  DEMO_CSV,
  DEMO_UPDATE_CSV,
  demoFile,
  demoProperties,
  stagedDemoImport,
} from "../../utils/audience-staged-import";
import { configureE2eForm } from "../../utils/form-api";
import { runE2eForms } from "../../utils/run-e2e-form";
import { e2eCredentials } from "../../utils/screen-out-api";

const KEEP: AudienceImportOptions = {
  emptyCells: AudienceImportOption.Keep,
  missingProperties: AudienceImportOption.Keep,
};
const CLEAR: AudienceImportOptions = {
  emptyCells: AudienceImportOption.Clear,
  missingProperties: AudienceImportOption.Clear,
};

/** Changed in the update file, with a stored `joined` the update leaves out. */
const CHANGED = "ACME-VIP-0001";
/** Same values in the update file, `last_visit` and `region` left empty. */
const EMPTIED = "ACME-STD-0011";
const OFF_CHOICE = "ACME-VIP-0003";

async function demoForm(api: EndatixApi, name: string): Promise<PanelForm> {
  const form = await preparePanelFormWithProperties(
    api,
    name,
    demoProperties(),
  );
  try {
    await configureE2eForm(api, form.formId, {
      definitionJson: demoFile("acme-demo.survey.json"),
      ...PRIVATE_ONE_PER_USER,
    });
    return form;
  } catch (error) {
    await form.release(true);
    throw error;
  }
}

/** Runs the body on a new demo form; a failure, or `E2E_KEEP_DATA=1`, keeps the form. */
async function withDemoForm(
  name: string,
  body: (api: EndatixApi, formId: string) => Promise<void>,
): Promise<void> {
  const api = (await signInForAudience())!;
  const form = await demoForm(api, name);
  await runE2eForms(
    [form.formId],
    (keep) => form.release(keep),
    () => body(api, form.formId),
  );
}

/** A participant's values keyed by Property variable name. */
async function valuesOf(
  api: EndatixApi,
  formId: string,
  identifier: string,
): Promise<Record<string, string>> {
  const [properties, people] = await Promise.all([
    api.audience.listProperties(formId),
    api.audience.listPeople(formId, {
      search: identifier,
      page: 1,
      pageSize: 5,
    }),
  ]);
  if (!properties.success || !people.success) {
    throw new Error(`Read ${identifier} failed`);
  }
  const person = people.data.items.find(
    (item) => item.identifier === identifier,
  );
  if (!person) throw new Error(`${identifier} is not on the form`);
  const variable = new Map(properties.data.map((p) => [p.id, p.variableName]));
  return Object.fromEntries(
    Object.entries(person.values).map(([id, value]) => {
      const name = variable.get(id);
      if (!name)
        throw new Error(`${identifier} has a value for unknown Property ${id}`);
      return [name, value];
    }),
  );
}

function demoCell(
  fileName: string,
  identifier: string,
  column: string,
): string {
  const [headers, ...rows] = readCsvRecords(demoFile(fileName));
  const row = rows.find((cells) => cells[0] === identifier);
  return row?.[headers.indexOf(column)] ?? "";
}

test.describe("ACME demo Participant import", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  // Live Hub/API session; CI without E2E_EMAIL / E2E_PASSWORD has nothing to call.
  test.beforeEach(() => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
  });

  test("the demo file creates every Property type and rejects two rows", async () => {
    await withDemoForm("ACME demo", async (api, formId) => {
      const { view, rejectedRows } = await stagedDemoImport(
        api,
        formId,
        DEMO_CSV,
        demoProperties(),
        KEEP,
      );
      expect(view.written.createdCount).toBe(28);
      expect(view.written.rejectedCount).toBe(2);
      expect(
        rejectedRows.map(({ rowNumber, reason, cells }) => [
          rowNumber,
          reason,
          cells[0],
        ]),
      ).toEqual([
        [13, "Identifier is required.", ""],
        [21, "Identifier appears more than once in the file.", "ACME-STD-0004"],
      ]);

      // The helper creates the Properties in parallel, so their order is not fixed.
      const properties = await api.audience.listProperties(formId);
      const types = (list: readonly { name: string; dataType: string }[]) =>
        Object.fromEntries(list.map((p) => [p.name, p.dataType]));
      expect(properties.success && types(properties.data)).toEqual(
        types(demoProperties()),
      );

      const vip = await api.audience.listPeople(formId, {
        search: "VIP",
        page: 1,
        pageSize: 50,
      });
      expect(vip.success && vip.data.totalRecords).toBe(8);

      const offChoice = await valuesOf(api, formId, OFF_CHOICE);
      expect(offChoice.region).toBe("online");
      expect(JSON.parse(offChoice.tags)).toEqual([
        "tea",
        "pastries",
        "sandwiches",
      ]);
    });
  });

  test("the update file under keep updates 18 and keeps empty and missing values", async () => {
    await withDemoForm("ACME demo keep", async (api, formId) => {
      await stagedDemoImport(api, formId, DEMO_CSV, demoProperties(), KEEP);
      const { view } = await stagedDemoImport(
        api,
        formId,
        DEMO_UPDATE_CSV,
        demoProperties(),
        KEEP,
      );
      expect(view.written).toMatchObject({
        createdCount: 0,
        updatedCount: 18,
        skippedCount: 10,
      });

      const emptied = await valuesOf(api, formId, EMPTIED);
      expect(emptied.region).toBe(demoCell(DEMO_CSV, EMPTIED, "region"));
      const changed = await valuesOf(api, formId, CHANGED);
      expect(changed.joined).toBe(demoCell(DEMO_CSV, CHANGED, "joined"));
      expect(changed.age).toBe(demoCell(DEMO_UPDATE_CSV, CHANGED, "age"));
    });
  });

  test("the update file under clear updates 24 and clears empty and missing values", async () => {
    await withDemoForm("ACME demo clear", async (api, formId) => {
      await stagedDemoImport(api, formId, DEMO_CSV, demoProperties(), KEEP);
      const { view } = await stagedDemoImport(
        api,
        formId,
        DEMO_UPDATE_CSV,
        demoProperties(),
        CLEAR,
      );
      expect(view.written).toMatchObject({
        createdCount: 0,
        updatedCount: 24,
        skippedCount: 4,
      });

      const emptied = await valuesOf(api, formId, EMPTIED);
      expect(emptied.region).toBeUndefined();
      expect(emptied.last_visit).toBeUndefined();
      const changed = await valuesOf(api, formId, CHANGED);
      expect(changed.joined).toBeUndefined();
      expect(changed.age).toBe(demoCell(DEMO_UPDATE_CSV, CHANGED, "age"));
    });
  });
});
