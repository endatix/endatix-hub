import { expect, test } from "@playwright/test";
import { SignInPage } from "../../pages/auth/sign-in.page";
import { variableNameFromName } from "@/features/audience/property-types";
import {
  importPanelCsv,
  signInForAudience,
} from "../../utils/audience-import-api";
import { deleteForm, e2eCredentials } from "../../utils/screen-out-api";

test.describe("Audience panel CSV", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test("Cedar Grove Pulse imports 20 rows and shows a person", async ({
    page,
  }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const panel = await importPanelCsv(
      api!,
      "Cedar Grove Pulse",
      "cedar-grove-pulse.csv",
    );
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

      const credentials = e2eCredentials()!;
      const signIn = new SignInPage(page);
      await signIn.performSignInFlow(credentials.email, credentials.password);
      await page.goto(`/forms/${panel.formId}/audience`);
      await expect(page.getByText("CG-000001-01")).toBeVisible();
      await expect(page.getByText("3 to 4 people")).toBeVisible();
    } finally {
      await deleteForm(api!, panel.formId);
    }
  });

  test("5000-row sample imports at the MVP cap", async () => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const panel = await importPanelCsv(
      api!,
      "Cedar Grove Pulse 5000",
      "cedar-grove-pulse-5000.csv",
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
      expect(variableNameFromName("family_size")).toBe("family_size");
    } finally {
      await deleteForm(api!, panel.formId);
    }
  });
});
