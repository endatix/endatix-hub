import { expect, test, type Locator, type Page } from "@playwright/test";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { SignInPage } from "../../pages/auth/sign-in.page";
import { publishE2eForm } from "../../utils/form-api";
import { e2eCredentials, signInE2eApi } from "../../utils/screen-out-api";

const pixel = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const prefix = `<span title='Key'>Map&nbsp;</span><img src='${pixel}' width='24'> · `;
const suffix = " <strong title='Compass'>North</strong>";
const description = `${prefix}<img alt='Detail' src='${pixel}' style='width:40px;height:auto'>${suffix}`;
const question = { type: "text", name: "map", title: "Read the map", visible: true, description: { default: description, fr: "Carte" } };
const definition = { pages: [{ name: "page", elements: [question] }] };
type Owner = "form" | "template";

async function createOwner(api: EndatixApi, owner: Owner) {
  const name = `Resize ${owner} ${Date.now()}`;
  const jsonData = JSON.stringify(definition);
  if (owner === "form") {
    const id = await publishE2eForm(api, { name, definitionJson: jsonData, isPublic: false, limitOnePerUser: false });
    return { route: `/forms/${id}/design`, read: `/forms/${id}/definition`, remove: () => api.forms.delete(id) };
  }
  const created = await api.formTemplates.create({ name, jsonData });
  if (!created.success) throw new Error(created.error.message);
  const path = `/form-templates/${created.data.id}`;
  return { route: `/forms/templates/${created.data.id}`, read: path, remove: () => api.delete(path) };
}

async function selectDescription(page: Page) {
  await page.locator(".svc-question__content").filter({ hasText: question.title }).click();
  const field = page.locator('.spg-question[data-name="description"]:visible');
  if (!await field.isVisible()) await page.getByRole("button", { name: "General", exact: true }).click();
  return field.getByAltText("Detail");
}

async function dragCorner(page: Page, image: Locator) {
  const handle = image.locator("..").locator("[data-resize-handle=bottom-right]");
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw new Error("Image resize handle has no bounds");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 48, y + 48, { steps: 8 });
  await page.mouse.up();
}

async function expectStoredEdit(api: EndatixApi, path: string) {
  const response = await api.get<{ jsonData: string }>(path);
  if (!response.success) throw new Error(response.error.message);
  const saved = JSON.parse(response.data.jsonData);
  const html: string = saved.pages[0].elements[0].description.default;
  expect(html.startsWith(prefix) && html.endsWith(suffix)).toBe(true);
  expect(html.slice(prefix.length)).toContain('alt="Detail"');
  expect(html.slice(prefix.length)).toContain(`src="${pixel}"`);
  const width = Number(/width="(\d+)"/.exec(html.slice(prefix.length))?.[1]);
  expect(width).toBeGreaterThan(60);
  expect(saved).toEqual({ pages: [{ name: "page", elements: [{ ...question, description: { default: html, fr: "Carte" } }] }] });
  return width;
}

for (const owner of ["form", "template"] as const) {
  test(`resizes one image in a localized ${owner} description through Save and reopen`, async ({ page }) => {
    test.setTimeout(120_000);
    const api = await signInE2eApi();
    const item = await createOwner(api, owner);
    try {
      const { email, password } = e2eCredentials()!;
      await new SignInPage(page).performSignInFlow(email, password);
      await page.goto(item.route);
      const image = await selectDescription(page);
      await dragCorner(page, image);
      await page.getByRole("button", { name: owner === "form" ? "Save" : "Save Template", exact: true }).click();
      await expect(page.getByText(owner === "form" ? "Form changes saved." : "Template saved", { exact: true })).toBeVisible();
      const width = await expectStoredEdit(api, item.read);
      await page.reload();
      const reopened = await selectDescription(page);
      await expect.poll(() => reopened.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width);
    } finally {
      const deleted = await item.remove();
      if (!deleted.success) throw new Error(deleted.error.message);
    }
  });
}
