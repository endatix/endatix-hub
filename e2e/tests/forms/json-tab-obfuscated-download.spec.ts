import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Download, type Page, test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import {
  deleteForm,
  e2eCredentials,
  signInE2eApi,
} from "../../utils/screen-out-api";
import { openJsonTab, pasteIntoAce, saveEvidence } from "../../utils/json-tab";

const FIXTURE = readFileSync(
  path.join(
    process.cwd(),
    "e2e/fixtures/obfuscation/patient-intake.survey.json",
  ),
  "utf8",
);

const ORIGINAL_TEXTS = [
  "Patient intake",
  "Patientenaufnahme",
  "Tell us about your health",
  "Über Sie",
  "First name",
  "Vorname",
  "Your answers stay with your doctor",
  "Do you smoke?",
  "Yes, daily",
  "Nie geraucht",
  "Cigarettes per day",
  "Coffee cups",
  "Contact details",
  "Home address",
];

async function download(page: Page, item: string): Promise<Download> {
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: item, exact: true }).click();
  return downloading;
}

async function textOf(file: Download): Promise<string> {
  return readFile((await file.path())!, "utf8");
}

test.use({
  deviceScaleFactor: 2,
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});

test.describe("JSON tab obfuscated download", () => {
  test.setTimeout(180_000);

  test("downloads an obfuscated copy whose logic still runs in Preview", async ({
    page,
  }) => {
    const credentials = e2eCredentials()!;
    const api = await signInE2eApi();
    const name = `Patient intake ${Date.now()}`;
    const created = await api.forms.create({
      name,
      isEnabled: true,
      formDefinitionJsonData: "{}",
    });
    if (!created.success) {
      throw new Error(`Create form failed: ${created.error.message}`);
    }

    const formId = created.data.id;
    let failed = false;
    try {
      const signIn = new SignInPage(page);
      await signIn.performSignInFlow(credentials.email, credentials.password);
      await page.goto(`/forms/${formId}/design`);
      await openJsonTab(page);
      await pasteIntoAce(page, FIXTURE, "Patient intake");

      await page.getByRole("button", { name: "Export", exact: true }).click();
      await expect(
        page.getByRole("menuitem", { name: "Download obfuscated JSON" }),
      ).toBeVisible();
      await saveEvidence(
        page,
        page.locator("main"),
        "json-tab-download-menu_light.png",
      );
      await page.keyboard.press("Escape");

      const plain = await download(page, "Download JSON");
      expect(plain.suggestedFilename()).toBe("survey.json");
      expect(JSON.parse(await textOf(plain))).toEqual(JSON.parse(FIXTURE));

      const obfuscated = await download(page, "Download obfuscated JSON");
      expect(obfuscated.suggestedFilename()).toBe(`${name}.obf.json`);
      const obfuscatedText = await textOf(obfuscated);
      for (const original of ORIGINAL_TEXTS) {
        expect(obfuscatedText).not.toContain(original);
      }
      expect(JSON.parse(obfuscatedText).title).toHaveProperty("de");

      await pasteIntoAce(page, obfuscatedText, '"page1"');
      await page.getByText("Preview", { exact: true }).click();
      const cigarettes = page.locator('[data-name="q3"]');
      await expect(page.locator('[data-name="q2"]')).toBeVisible();
      await expect(cigarettes).toBeHidden();
      await page
        .locator('[data-name="q2"] .sd-item__control-label')
        .first()
        .click();
      await expect(cigarettes).toBeVisible();
      // SurveyJS animates a question in; capture it once the enter classes are gone.
      await expect(page.locator('[class*="--enter"]')).toHaveCount(0);
      await cigarettes.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await saveEvidence(
        page,
        page.locator("main"),
        "obfuscated-form-preview_light.png",
      );
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      const keep = failed || process.env.E2E_KEEP_DATA === "1";
      if (!keep) {
        await deleteForm(api, formId);
      }
    }
  });
});
