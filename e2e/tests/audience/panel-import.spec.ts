import { expect, test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import {
  importPanelCsv,
  signInForAudience,
  slugifyPropertyName,
} from "../../utils/audience-import-api";
import { deleteForm, e2eCredentials } from "../../utils/screen-out-api";

test.describe("Audience panel CSV", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("Muestra CO imports 20 rows and shows a person", async ({ page }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const panel = await importPanelCsv(api!, "Muestra CO", "muestra-co.csv");
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
          people.data.items.some((person) => person.identifier === "0570123456-01"),
        ).toBe(true);
      }

      const credentials = e2eCredentials()!;
      const signIn = new SignInPage(page);
      await signIn.performSignInFlow(credentials.email, credentials.password);
      await page.goto(`/forms/${panel.formId}/audience`);
      await expect(page.getByText("0570123456-01")).toBeVisible();
      await expect(page.getByText("3 a 4 personas")).toBeVisible();
    } finally {
      await deleteForm(api!, panel.formId);
    }
  });

  test("5000-row sample imports at the MVP cap", async () => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const panel = await importPanelCsv(api!, "Audience 5000", "audience-5000.csv");
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
      expect(slugifyPropertyName("Tamaño de Familia")).toBe("tama_o_de_familia");
    } finally {
      await deleteForm(api!, panel.formId);
    }
  });
});
