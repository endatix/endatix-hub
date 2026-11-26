import { expect, test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import { openJsonTab, pasteIntoAce } from "../../utils/json-tab";
import { deleteForm, e2eCredentials, signInE2eApi } from "../../utils/screen-out-api";

function definition(title: string) {
  return JSON.stringify({
    pages: [{ name: "page1", elements: [{ type: "text", name: "question", title }] }],
  }, null, 2);
}

test("saves successive edits without leaving the JSON Editor", async ({ page }) => {
  test.setTimeout(180_000);
  const api = await signInE2eApi();
  const created = await api.forms.create({
    name: `JSON Editor save ${Date.now()}`,
    isEnabled: true,
    formDefinitionJsonData: definition("Original"),
  });
  if (!created.success) throw new Error(created.error.message);
  const { id } = created.data;
  try {
    const { email, password } = e2eCredentials()!;
    await new SignInPage(page).performSignInFlow(email, password);
    await page.goto(`/forms/${id}/design`);
    await openJsonTab(page);
    const save = page.getByRole("button", { name: "Save", exact: true });
    for (const title of ["First edit", "Second edit"]) {
      await pasteIntoAce(page, definition(title), title);
      await save.click();
      const success = page.getByText("Form changes saved.", { exact: true });
      await expect(success).toBeVisible();
      await expect(success).toBeHidden({ timeout: 15_000 });
    }
    await save.click();
    await expect(page.getByText("Nothing to save", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator(".ace_editor")).toContainText("Second edit");
  } finally {
    await deleteForm(api, id);
  }
});
