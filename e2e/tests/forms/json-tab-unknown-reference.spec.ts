import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
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

const EVIDENCE_DIR = process.env.E2E_EVIDENCE_DIR;

/** Ace ignores keyboard.insertText. Select all, then Ace's own paste command. */
async function pasteIntoAce(page: Page, text: string): Promise<void> {
  const editor = page.locator(".ace_editor");
  await editor.click();
  await page.evaluate((value) => {
    const root = document.querySelector(".ace_editor");
    const ace = (
      window as Window & {
        ace?: {
          edit: (el: Element) => {
            focus: () => void;
            selectAll: () => void;
            execCommand: (command: string, args: string) => void;
          };
        };
      }
    ).ace;
    if (!root || !ace) {
      throw new Error("Ace is not loaded");
    }
    const aceEditor = ace.edit(root);
    aceEditor.focus();
    aceEditor.selectAll();
    aceEditor.execCommand("paste", value);
  }, text);
  await expect(editor).toContainText("Family size");
}

async function saveEvidence(
  page: Page,
  region: Locator,
  name: string,
): Promise<void> {
  if (!EVIDENCE_DIR) {
    return;
  }
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  await region.screenshot({ path: path.join(EVIDENCE_DIR, name) });
}

test.use({
  deviceScaleFactor: 2,
  viewport: { width: 1440, height: 900 },
});

test.describe("JSON tab unknown references", () => {
  test.setTimeout(180_000);

  test("pasting a survey that reads runtime variables reaches Designer", async ({
    page,
  }) => {
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

      await expect(
        page.getByRole("tab", { name: "Designer", exact: true }),
      ).toBeVisible();
      const jsonTab = page.getByRole("tab", { name: "JSON Editor", exact: true });
      if (!(await jsonTab.isVisible())) {
        await page
          .getByRole("tablist")
          .getByRole("button", { name: "More", exact: true })
          .click();
      }
      const jsonItem = page.getByRole("menuitem", {
        name: "JSON Editor",
        exact: true,
      });
      if (await jsonItem.isVisible()) {
        await jsonItem.click();
      } else {
        await jsonTab.click();
      }
      await pasteIntoAce(page, FIXTURE);
      await expect(page.getByText("is not found").first()).toBeVisible();
      await saveEvidence(
        page,
        page.locator("main"),
        "json-tab-unknown-reference-warnings_light.png",
      );

      await page.getByText("Designer", { exact: true }).click();

      await expect(page.locator(".svc-tabbed-menu-item--selected")).toHaveText(
        "Designer",
      );
      await expect(
        page.locator(".sd-question__title").getByText("Family size"),
      ).toBeVisible();
      await saveEvidence(
        page,
        page.locator("main"),
        "json-tab-designer_light.png",
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
