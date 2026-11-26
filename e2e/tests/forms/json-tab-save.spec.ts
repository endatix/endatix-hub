import { expect, test, type Page } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import { releaseE2eForms } from "../../utils/e2e-form-release";
import { openJsonTab, pasteIntoAce } from "../../utils/json-tab";
import { runE2eForms } from "../../utils/run-e2e-form";
import { e2eCredentials, signInE2eApi } from "../../utils/screen-out-api";

function definition(title: string) {
  return JSON.stringify(
    {
      pages: [
        {
          name: "page1",
          elements: [{ type: "text", name: "question", title }],
        },
      ],
    },
    null,
    2,
  );
}

async function expectCleanEditor(page: Page, title: string) {
  await expect(page.locator(".ace_editor")).toContainText(title);
  await expect(page.getByText("Json modified", { exact: true })).toBeHidden();
}

async function saveAndReloadJson(page: Page, title: string) {
  await expect(page.getByText("Json modified", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("Form changes saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expectCleanEditor(page, title);
}

async function importDefinition(page: Page, title: string) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "form.json",
    mimeType: "application/json",
    buffer: Buffer.from(definition(title)),
  });
}

async function verifyJsonTabChanges(page: Page) {
  await expectCleanEditor(page, "Original");
  await page.getByRole("tab", { name: "Designer", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Designer" })).toBeVisible();
  await openJsonTab(page);
  await expectCleanEditor(page, "Original");
  await importDefinition(page, "First import");
  await saveAndReloadJson(page, "First import");
  // The URL restored the JSON tab; import again without switching tabs.
  await importDefinition(page, "Imported");
  await saveAndReloadJson(page, "Imported");
  // Select the title in Ace; only the browser keypress changes its value.
  await page.locator(".ace_editor").evaluate((root) => {
    const { ace } = window as Window & { ace: typeof import("ace-builds") };
    const instance = ace.edit(root as HTMLElement);
    instance.find("Imported", { wrap: true });
    instance.focus();
  });
  await expectCleanEditor(page, "Imported");
  await page.keyboard.press("X");
  await saveAndReloadJson(page, '"X"');
}

async function verifyPastedChanges(page: Page) {
  const save = page.getByRole("button", { name: "Save", exact: true });
  for (const title of ["First edit", "Second edit"]) {
    await pasteIntoAce(page, definition(title), title);
    await save.click();
    const success = page.getByText("Form changes saved.", { exact: true });
    await expect(success).toBeVisible();
    await expect(success).toBeHidden({ timeout: 15_000 });
  }
  await save.click();
  await expect(
    page.getByText("Nothing to save", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".ace_editor")).toContainText("Second edit");
}

test.use({ viewport: { width: 1920, height: 1080 }, actionTimeout: 15000 });

test("opens clean and saves imported, typed and pasted JSON without leaving the editor", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const api = await signInE2eApi();
  const created = await api.forms.create({
    name: `JSON Editor save ${Date.now()}`,
    isEnabled: true,
    formDefinitionJsonData: definition("Original"),
  });
  if (!created.success) throw new Error(created.error.message);
  const { id } = created.data;
  await runE2eForms(
    [id],
    (keep) => releaseE2eForms(api, [id], keep),
    async () => {
      const { email, password } = e2eCredentials()!;
      await new SignInPage(page).performSignInFlow(email, password);
      await page.goto(`/forms/${id}/design`);
      await openJsonTab(page);
      await verifyJsonTabChanges(page);
      await verifyPastedChanges(page);
    },
  );
});
