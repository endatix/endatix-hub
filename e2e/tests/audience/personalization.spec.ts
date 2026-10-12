import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type FrameLocator, type Page } from "@playwright/test";
import { variableNameFromName } from "@/features/audience/property-types";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  panelCsv,
  preparePanelForm,
  signInForAudience,
} from "../../utils/audience-import-api";
import { playgroundEmbedHostHref } from "../../utils/open-embed-host";
import {
  createShareAccessToken,
  trySecondOnBehalf,
} from "../../utils/screen-out-api";

const FIXTURE = "cedar-grove-pulse.csv";
const SUBJECT = "CG-000001-01";
const CITY = "03. MIDWEST - COLUMBUS";
const FIXTURES = path.join(process.cwd(), "e2e/fixtures/audience");
const SURFACES = ["share", "iframe"] as const;

type SurfaceKind = (typeof SURFACES)[number];
type SurveySurface = Page | FrameLocator;

type OnBehalfBody = {
  id: string;
  personalization?: { variables?: Record<string, unknown> } | null;
};

type StoredSubmission = {
  jsonData: string;
  isComplete: boolean;
  personalization?: { variables?: Record<string, unknown> } | null;
};

function oneRowCsv(): string {
  const [header, first] = panelCsv(FIXTURE).split(/\r?\n/);
  return `${header}\n${first}\n`;
}

function hubBaseUrl(): string {
  return process.env.BASE_URL ?? "http://localhost:3000";
}

function embedHostOrigin(): string {
  return process.env.E2E_EMBED_HOST_URL ?? "http://localhost:5000";
}

async function publishSurvey(api: EndatixApi, formId: string): Promise<void> {
  const published = await api.put(`/forms/${formId}/definition`, {
    isDraft: false,
    jsonData: readFileSync(
      path.join(FIXTURES, "cedar-grove-pulse.survey.json"),
      "utf8",
    ),
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
): Promise<{ submissionId: string; shareToken: string }> {
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
  return {
    submissionId: created.data.id,
    shareToken: await createShareAccessToken(api, formId, created.data.id),
  };
}

function shareUrl(formId: string, token: string, city?: string): string {
  const url = new URL(`/share/${formId}`, hubBaseUrl());
  url.searchParams.set("token", token);
  if (city) url.searchParams.set("city", city);
  return url.toString();
}

function surfaceOf(page: Page, kind: SurfaceKind, formId: string): SurveySurface {
  return kind === "share"
    ? page
    : page.frameLocator(`iframe[id^="edxf-${formId}"]`);
}

async function gotoSurface(
  page: Page,
  kind: SurfaceKind,
  formId: string,
  token: string,
  city?: string,
): Promise<SurveySurface> {
  if (kind === "share") {
    await page.goto(shareUrl(formId, token, city));
  } else {
    await page.goto(
      playgroundEmbedHostHref(embedHostOrigin(), formId, hubBaseUrl(), token),
    );
  }
  return surfaceOf(page, kind, formId);
}

async function openSurvey(
  page: Page,
  kind: SurfaceKind,
  formId: string,
  token: string,
  city?: string,
): Promise<SurveySurface> {
  const surface = await gotoSurface(page, kind, formId, token, city);
  await surface.locator(".sd-root-modern").waitFor({ timeout: 30_000 });
  return surface;
}

async function expectFrozen(survey: SurveySurface): Promise<void> {
  await expect(survey.getByText(CITY)).toBeVisible();
  await expect(survey.getByText("Shown when age is at least 50")).toBeVisible();
  await expect(questionInput(survey, "Age in months")).toHaveValue("780");
}

function questionInput(survey: SurveySurface, title: string) {
  return survey
    .locator(".sd-question")
    .filter({ hasText: title })
    .locator("input");
}

async function editFamilySize(page: Page, survey: SurveySurface): Promise<void> {
  const family = questionInput(survey, "Family size");
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
}

async function expectStoredAnswer(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<void> {
  const read = await api.get<StoredSubmission>(
    `/forms/${formId}/submissions/${submissionId}`,
  );
  if (!read.success) {
    throw new Error(`Read submission failed: ${read.error.message}`);
  }
  const answers = JSON.parse(read.data.jsonData) as Record<string, unknown>;
  expect(read.data.isComplete).toBe(true);
  expect(answers.familySize).toBe("9 people");
  expect(read.data.personalization?.variables?.city).toBe(CITY);
  expect(read.data.personalization?.variables?.age).toBe(65);
}

const ALREADY_SUBMITTED = "This form has already been completed.";

async function expectThankYou(surface: SurveySurface): Promise<void> {
  await expect(surface.getByText("Thank you")).toBeVisible({ timeout: 15_000 });
  await expect(surface.getByText(ALREADY_SUBMITTED)).toBeVisible();
}

async function completeSurvey(survey: SurveySurface): Promise<void> {
  await survey.getByRole("button", { name: "Complete" }).click();
  await survey.getByText("Thank you").waitFor({ timeout: 15_000 });
}

test.describe("On-behalf personalization", () => {
  test.setTimeout(120_000);

  test("one response shows the frozen values, then thank you on reload", async ({
    page,
  }) => {
    const api = await signInForAudience();
    test.skip(!api, "Set E2E_EMAIL and E2E_PASSWORD.");
    const form = await preparePanelForm(api!, "Cedar Grove one response", FIXTURE);
    try {
      await publishSurvey(api!, form.formId);
      await importFirstRow(api!, form.formId);
      const opened = await openOnBehalf(api!, form.formId);

      const share = await openSurvey(page, "share", form.formId, opened.shareToken);
      await expectFrozen(share);
      const withCity = await openSurvey(
        page,
        "share",
        form.formId,
        opened.shareToken,
        "Other",
      );
      await expect(withCity.getByText(CITY)).toBeVisible();
      await expect(withCity.getByText("Other")).toHaveCount(0);

      const iframe = await openSurvey(page, "iframe", form.formId, opened.shareToken);
      await expectFrozen(iframe);

      const back = await openSurvey(page, "share", form.formId, opened.shareToken);
      await editFamilySize(page, back);
      await completeSurvey(back);

      for (const surface of SURFACES) {
        const returned = await gotoSurface(
          page,
          surface,
          form.formId,
          opened.shareToken,
        );
        await expectThankYou(returned);
      }

      await expectStoredAnswer(api!, form.formId, opened.submissionId);
      const second = await trySecondOnBehalf(api!, form.formId, SUBJECT);
      expect(second.success, "limit one per user refuses a second submission").toBe(
        false,
      );
    } finally {
      await form.cleanup();
    }
  });
});
