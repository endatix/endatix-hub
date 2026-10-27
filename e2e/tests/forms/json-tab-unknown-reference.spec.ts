import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import {
  deleteForm,
  e2eCredentials,
  signInE2eApi,
} from "../../utils/screen-out-api";

const FIXTURE = readFileSync(
  path.join(
    process.cwd(),
    "e2e/fixtures/audience/cedar-grove-pulse.survey.json",
  ),
  "utf8",
);

test.describe("JSON tab unknown references", () => {
  test.setTimeout(120_000);

  test("pasting a survey that reads runtime variables reaches Designer", async ({
    page,
  }) => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
    const credentials = e2eCredentials()!;
    const api = await signInE2eApi();
    const created = await api.forms.create({
      name: `JSON tab unknown references ${Date.now()}`,
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

      const jsonEditor = page.getByText("JSON Editor", { exact: true });
      if (!(await jsonEditor.first().isVisible())) {
        await page
          .getByRole("tablist")
          .getByRole("button", { name: "More", exact: true })
          .click();
      }
      await jsonEditor.filter({ visible: true }).click();
      const editor = page.locator(".ace_editor");
      await editor.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.insertText(FIXTURE);
      await expect(page.getByText("is not found").first()).toBeVisible();

      await page.getByText("Designer", { exact: true }).click();

      await expect(page.locator(".svc-tabbed-menu-item--selected")).toHaveText(
        "Designer",
      );
      await expect(
        page.locator(".sd-question__title").getByText("Family size"),
      ).toBeVisible();
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
