import { expect, test, type Page } from "@playwright/test";
import { variableNameFromName } from "@/features/audience/property-types";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  panelCsv,
  panelDefinition,
  preparePanelForm,
  PRIVATE_ONE_PER_USER,
  signInForAudience,
} from "../../utils/audience-import-api";
import { configureE2eForm } from "../../utils/form-api";
import { runE2eForms } from "../../utils/run-e2e-form";
import {
  createShareAccessToken,
  e2eCredentials,
  trySecondOnBehalf,
} from "../../utils/screen-out-api";
import {
  completeSurvey,
  expectThankYou,
  gotoSurface,
  openSurvey,
  questionInput,
  SURFACES,
  type SurveySurface,
} from "../../utils/survey-surface";

const FIXTURE = "cedar-grove-pulse.csv";
const SUBJECT = "CG-000001-01";
const CITY = "03. MIDWEST - COLUMBUS";

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

async function publishSurvey(api: EndatixApi, formId: string): Promise<void> {
  await configureE2eForm(api, formId, {
    definitionJson: panelDefinition("cedar-grove-pulse.survey.json"),
    ...PRIVATE_ONE_PER_USER,
  });
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

async function expectFrozen(survey: SurveySurface): Promise<void> {
  await expect(survey.getByText(CITY)).toBeVisible();
  await expect(survey.getByText("Shown when age is at least 50")).toBeVisible();
  await expect(questionInput(survey, "Age in months")).toHaveValue("780");
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

test.describe("On-behalf personalization", () => {
  test.setTimeout(120_000);

  // Live Hub/API session; CI without E2E_EMAIL / E2E_PASSWORD has nothing to call.
  test.beforeEach(() => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
  });

  test("one response shows the frozen values, then thank you on reload", async ({
    page,
  }) => {
    const api = await signInForAudience();
    if (!api) {
      throw new Error("E2E sign-in failed");
    }
    const form = await preparePanelForm(api, "Cedar Grove one response", FIXTURE);
    await runE2eForms([form.formId], (keep) => form.release(keep), async () => {
      await publishSurvey(api, form.formId);
      await importFirstRow(api, form.formId);
      const opened = await openOnBehalf(api, form.formId);

      const share = await openSurvey(page, "share", form.formId, opened.shareToken);
      await expectFrozen(share);
      const withCity = await openSurvey(
        page,
        "share",
        form.formId,
        opened.shareToken,
        { city: "Other" },
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

      await expectStoredAnswer(api, form.formId, opened.submissionId);
      const second = await trySecondOnBehalf(api, form.formId, SUBJECT);
      expect(second.success, "limit one per user refuses a second submission").toBe(
        false,
      );
    });
  });
});
