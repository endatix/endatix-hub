import { expect, test, type Page } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import {
  importPanelCsv,
  panelCsv,
  preparePanelForm,
  signInForAudience,
} from "../../utils/audience-import-api";
import { e2eCredentials } from "../../utils/screen-out-api";

const SAMPLE = "cedar-grove-pulse.csv";
const SAMPLE_5000 = "cedar-grove-pulse-5000.csv";

async function openAudience(page: Page, formId: string): Promise<void> {
  const credentials = e2eCredentials()!;
  const signIn = new SignInPage(page);
  await signIn.performSignInFlow(credentials.email, credentials.password);
  await page.goto(`/forms/${formId}/audience`);
}

/** Every server action call the page makes from now on; the import is the only one the wizard sends. */
function recordServerActions(page: Page): string[] {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) {
      calls.push(request.url());
    }
  });
  return calls;
}

/** The 5,000-row sample with one more person, one over the cap. */
function oneRowOverTheCap(): Buffer {
  const csv = panelCsv(SAMPLE_5000).trimEnd();
  const lastRow = csv.slice(csv.lastIndexOf("\n") + 1);
  const extra = lastRow.replace(/^[^,]+/, "CG-OVER-CAP-01");
  return Buffer.from(`${csv}\n${extra}\n`, "utf8");
}

test.describe("Audience panel CSV", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("the wizard imports the Cedar Grove Pulse sample", async ({ page }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const form = await preparePanelForm(api!, "Cedar Grove Pulse UI", SAMPLE);
    try {
      await openAudience(page, form.formId);
      await page.getByRole("button", { name: "Import CSV" }).click();
      await page
        .getByLabel("CSV file")
        .setInputFiles(`e2e/fixtures/audience/${SAMPLE}`);
      await expect(
        page.getByText(`${SAMPLE}: 20 rows, 12 columns.`),
      ).toBeVisible();

      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText(/Suggested from its name/)).toBeVisible();
      await expect(page.getByText("11 of 11 imported")).toBeVisible();

      await page.getByRole("button", { name: "Continue" }).click();
      await page.getByRole("button", { name: "Import 20 rows" }).click();

      await expect(
        page.getByText("Import finished", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText(/20 added/)).toBeVisible();
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByText("CG-000001-01")).toBeVisible();
    } finally {
      await form.cleanup();
    }
  });

  test("the wizard refuses a file over 5,000 rows and sends nothing", async ({
    page,
  }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const form = await preparePanelForm(api!, "Cedar Grove Pulse cap", SAMPLE);
    try {
      await openAudience(page, form.formId);
      const actions = recordServerActions(page);
      await page.getByRole("button", { name: "Import CSV" }).click();
      await page.getByLabel("CSV file").setInputFiles({
        name: "over-the-cap.csv",
        mimeType: "text/csv",
        buffer: oneRowOverTheCap(),
      });

      await expect(
        page.getByText(/The file has 5,001 rows\. Import up to 5,000/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continue" }),
      ).toBeDisabled();
      expect(actions).toEqual([]);
    } finally {
      await form.cleanup();
    }
  });

  test("Cedar Grove Pulse imports 20 rows and shows a person", async ({
    page,
  }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const panel = await importPanelCsv(api!, "Cedar Grove Pulse", SAMPLE);
    try {
      expect(panel.result.rejectedCount).toBe(0);
      expect(panel.result.createdCount).toBe(20);
      const people = await api!.audience.listPeople(panel.formId, {
        page: 1,
        pageSize: 50,
      });
      expect(people.success).toBe(true);
      if (people.success) {
        expect(people.data.totalRecords).toBe(20);
        expect(
          people.data.items.some(
            (person) => person.identifier === "CG-000001-01",
          ),
        ).toBe(true);
      }

      await openAudience(page, panel.formId);
      await expect(page.getByText("CG-000001-01")).toBeVisible();
      await expect(page.getByText("3 to 4 people")).toBeVisible();
    } finally {
      await panel.cleanup();
    }
  });

  test("5000-row sample imports at the MVP cap", async () => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const panel = await importPanelCsv(
      api!,
      "Cedar Grove Pulse 5000",
      SAMPLE_5000,
    );
    try {
      expect(panel.result.rejectedCount).toBe(0);
      expect(panel.result.createdCount).toBe(5000);
      const people = await api!.audience.listPeople(panel.formId, {
        page: 1,
        pageSize: 1,
      });
      expect(people.success).toBe(true);
      if (people.success) {
        expect(people.data.totalRecords).toBe(5000);
      }
    } finally {
      await panel.cleanup();
    }
  });
});
