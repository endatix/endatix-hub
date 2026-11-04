import { execFileSync } from "node:child_process";
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
  const variable = new Map(properties.data.map((p) => [p.id, p.variableName]));
  return Object.fromEntries(
    Object.entries(person?.values ?? {}).map(([id, value]) => [
      variable.get(id),
      value,
    ]),
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

test.describe("Audience demo fixtures", () => {
  test("the generator's output is the committed files", () => {
    const run = () =>
      execFileSync("node", ["e2e/fixtures/audience/generate.mjs", "--check"], {
        encoding: "utf8",
      });
    expect(run()).toContain("up to date");
  });

  test("one participant's region is not among the radiogroup's choices", () => {
    const survey = JSON.parse(demoFile("acme-demo.survey.json"));
    const radiogroup = survey.pages[0].elements.find(
      (element: { type: string }) => element.type === "radiogroup",
    );
    const choices = radiogroup.choices.map(
      (choice: { value: string }) => choice.value,
    );
    const [headers, ...rows] = readCsvRecords(demoFile(DEMO_CSV));
    const region = headers.indexOf("region");
    const offChoice = rows.filter((cells) => !choices.includes(cells[region]));
    expect(offChoice.map((cells) => cells[0])).toEqual([OFF_CHOICE]);
  });
});

test.describe("Audience demo import", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  // Live Hub/API session; CI without E2E_EMAIL / E2E_PASSWORD has nothing to call.
  test.beforeEach(() => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
  });

  test("the demo file creates every Property type and rejects two rows", async () => {
    const api = (await signInForAudience())!;
    const form = await demoForm(api, "ACME demo");
    try {
      const { view, rejectedRows } = await stagedDemoImport(
        api,
        form.formId,
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
      const properties = await api.audience.listProperties(form.formId);
      const types = (list: readonly { name: string; dataType: string }[]) =>
        Object.fromEntries(list.map((p) => [p.name, p.dataType]));
      expect(properties.success && types(properties.data)).toEqual(
        types(demoProperties()),
      );

      const vip = await api.audience.listPeople(form.formId, {
        search: "VIP",
        page: 1,
        pageSize: 50,
      });
      expect(vip.success && vip.data.totalRecords).toBe(8);

      const offChoice = await valuesOf(api, form.formId, OFF_CHOICE);
      expect(offChoice.region).toBe("online");
      expect(JSON.parse(offChoice.tags)).toEqual([
        "tea",
        "pastries",
        "sandwiches",
      ]);
    } finally {
      await form.cleanup();
    }
  });

  test("the update file under keep updates 18 and keeps empty and missing values", async () => {
    const api = (await signInForAudience())!;
    const form = await demoForm(api, "ACME demo keep");
    try {
      await stagedDemoImport(
        api,
        form.formId,
        DEMO_CSV,
        demoProperties(),
        KEEP,
      );
      const { view } = await stagedDemoImport(
        api,
        form.formId,
        DEMO_UPDATE_CSV,
        demoProperties(),
        KEEP,
      );
      expect(view.written).toMatchObject({
        createdCount: 0,
        updatedCount: 18,
        skippedCount: 10,
      });

      const emptied = await valuesOf(api, form.formId, EMPTIED);
      expect(emptied.region).toBe(demoCell(DEMO_CSV, EMPTIED, "region"));
      const changed = await valuesOf(api, form.formId, CHANGED);
      expect(changed.joined).toBe(demoCell(DEMO_CSV, CHANGED, "joined"));
      expect(changed.age).toBe(demoCell(DEMO_UPDATE_CSV, CHANGED, "age"));
    } finally {
      await form.cleanup();
    }
  });

  test("the update file under clear updates 24 and clears empty and missing values", async () => {
    const api = (await signInForAudience())!;
    const form = await demoForm(api, "ACME demo clear");
    try {
      await stagedDemoImport(
        api,
        form.formId,
        DEMO_CSV,
        demoProperties(),
        KEEP,
      );
      const { view } = await stagedDemoImport(
        api,
        form.formId,
        DEMO_UPDATE_CSV,
        demoProperties(),
        CLEAR,
      );
      expect(view.written).toMatchObject({
        createdCount: 0,
        updatedCount: 24,
        skippedCount: 4,
      });

      const emptied = await valuesOf(api, form.formId, EMPTIED);
      expect(emptied.region).toBeUndefined();
      expect(emptied.last_visit).toBeUndefined();
      const changed = await valuesOf(api, form.formId, CHANGED);
      expect(changed.joined).toBeUndefined();
      expect(changed.age).toBe(demoCell(DEMO_UPDATE_CSV, CHANGED, "age"));
    } finally {
      await form.cleanup();
    }
  });
});
