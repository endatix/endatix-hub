import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  panelCsv,
  preparePanelForm,
  signInForAudience,
} from "../../utils/audience-import-api";
import { createShareAccessToken } from "../../utils/screen-out-api";
import { variableNameFromName } from "@/features/audience/property-types";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";

const FIXTURE = "cedar-grove-pulse.csv";
const SUBJECT = "CG-000001-01";
const CITY = "03. MIDWEST - COLUMBUS";
const FIXTURES = path.join(process.cwd(), "e2e/fixtures/audience");

type OnBehalfBody = {
  id: string;
  personalization?: { variables?: Record<string, unknown> } | null;
};

function oneRowCsv(): string {
  const [header, first] = panelCsv(FIXTURE).split(/\r?\n/);
  return `${header}\n${first}\n`;
}

function surveyJson(): string {
  return readFileSync(path.join(FIXTURES, "cedar-grove-pulse.survey.json"), "utf8");
}

async function publishSurvey(api: EndatixApi, formId: string): Promise<void> {
  const published = await api.put(`/forms/${formId}/definition`, {
    isDraft: false,
    jsonData: surveyJson(),
  });
  if (!published.success) {
    throw new Error(`Publish definition failed: ${published.error.message}`);
  }
  const updated = await api.forms.update(formId, {
    isPublic: false,
    limitOnePerUser: true,
    submissionTokenExpiryHours: 24,
  });
  if (!updated.success) {
    throw new Error(`Update form failed: ${updated.error.message}`);
  }
}

async function importFirstRow(api: EndatixApi, formId: string): Promise<void> {
  const headers = oneRowCsv().split(/\r?\n/, 1)[0]?.split(",") ?? [];
  const imported = await api.audience.importCsv(formId, {
    csvText: oneRowCsv(),
    identifierColumn: "external_id",
    fileName: FIXTURE,
    propertyColumns: Object.fromEntries(
      headers
        .filter((header) => header !== "external_id")
        .map((header) => [variableNameFromName(header), header]),
    ),
  });
  if (!imported.success) {
    throw new Error(`Import failed: ${imported.error.message}`);
  }
}

async function openOnBehalf(
  api: EndatixApi,
  formId: string,
): Promise<{ submissionId: string; token: string }> {
  const created = await api.post<OnBehalfBody>(
    `/forms/${formId}/submissions/onbehalf`,
    {
      isComplete: false,
      jsonData: "{}",
      submitter: { externalSubjectId: SUBJECT, displayId: SUBJECT },
    },
  );
  if (!created.success) {
    throw new Error(`On-behalf create failed: ${created.error.message}`);
  }
  const variables = created.data.personalization?.variables;
  if (variables?.city !== CITY || variables?.age !== 65) {
    throw new Error(
      "On-behalf did not return the frozen city and age. The API needs on-behalf personalization.",
    );
  }
  const token = await createShareAccessToken(api, formId, created.data.id);
  return { submissionId: created.data.id, token };
}

function embedUrl(formId: string, token: string, city?: string): string {
  const url = new URL(
    `/embed/${formId}`,
    process.env.BASE_URL ?? "http://localhost:3000",
  );
  url.searchParams.set("token", token);
  if (city) url.searchParams.set("city", city);
  return url.toString();
}

async function openEmbed(page: Page, formId: string, token: string, city?: string) {
  await page.goto(embedUrl(formId, token, city));
  const survey = page.locator(".sd-root-modern, .sd-root");
  await survey.waitFor({ timeout: 30_000 });
  return survey;
}

test.describe("On-behalf embed", () => {
  test.setTimeout(120_000);

  test("frozen city and age show, and an edited answer stays", async ({ page }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const form = await preparePanelForm(api!, "Cedar Grove embed", FIXTURE);
    try {
      await publishSurvey(api!, form.formId);
      await importFirstRow(api!, form.formId);
      const opened = await openOnBehalf(api!, form.formId);

      const survey = await openEmbed(page, form.formId, opened.token);
      await expect(survey.getByText(CITY)).toBeVisible();
      await expect(survey.getByText("Shown when age is at least 50")).toBeVisible();
      await expect(
        survey.locator(".sd-question").filter({ hasText: "Age in months" }).locator("input"),
      ).toHaveValue("780");

      const replaced = await openEmbed(page, form.formId, opened.token, "Other");
      await expect(replaced.getByText(CITY)).toBeVisible();
      await expect(replaced.getByText("Other")).toHaveCount(0);

      const family = replaced
        .locator(".sd-question")
        .filter({ hasText: "Family size" })
        .locator("input");
      await family.click();
      await family.fill("");
      const saved = page.waitForResponse(
        (response) =>
          response.url().includes("/submissions") &&
          response.request().method() !== "GET" &&
          response.ok(),
        { timeout: 20_000 },
      );
      await family.pressSequentially("9 people");
      await family.press("Tab");
      await saved;

      const reopened = await openEmbed(page, form.formId, opened.token);
      await expect(
        reopened.locator(".sd-question").filter({ hasText: "Family size" }).locator("input"),
      ).toHaveValue("9 people");
    } finally {
      await form.cleanup();
    }
  });
});
