import { expect, test } from "@playwright/test";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { publishE2eForm } from "../../utils/form-api";
import { releaseE2eForms } from "../../utils/e2e-form-release";
import { runE2eForms } from "../../utils/run-e2e-form";
import { e2eCredentials, signInE2eApi } from "../../utils/screen-out-api";
import { hubBaseUrl } from "../../utils/survey-surface";

const GERMAN_ONLY_SURVEY = {
  locale: "de",
  pages: [
    {
      elements: [{ type: "text", name: "name", title: "Wie heißen Sie?" }],
    },
  ],
};

test.describe("Share link survey language", () => {
  let api: EndatixApi;

  test.beforeAll(async () => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
    api = await signInE2eApi();
  });

  test("a single-language survey shows its buttons in its own language", async ({
    page,
  }) => {
    const formId = await publishE2eForm(api, {
      name: `e2e survey locale ${Date.now()}`,
      definitionJson: JSON.stringify(GERMAN_ONLY_SURVEY),
      isPublic: true,
      limitOnePerUser: false,
    });

    await runE2eForms(
      [formId],
      (keep) => releaseE2eForms(api, [formId], keep),
      async () => {
        await page.goto(new URL(`/share/${formId}`, hubBaseUrl()).toString());
        const root = page.locator(".sd-root-modern");
        await root.waitFor({ timeout: 30_000 });

        await expect(root.getByText("Wie heißen Sie?")).toBeVisible();
        await expect(
          root.getByRole("button", { name: "Abschließen" }),
        ).toBeVisible();
        await expect(
          root.getByRole("button", { name: "Complete" }),
        ).toHaveCount(0);
      },
    );
  });
});
