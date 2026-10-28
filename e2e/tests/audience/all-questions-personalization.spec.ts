import { expect, test, type Page } from "@playwright/test";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  AudienceLinkStatusKind,
  type AudiencePerson,
} from "@/lib/endatix-api/audience/types";
import {
  PRIVATE_ONE_PER_USER,
  seedAllQuestionsForm,
  signInForAudience,
  type PanelForm,
} from "../../utils/audience-import-api";
import {
  createOnBehalf,
  createShareAccessToken,
  e2eCredentials,
  trySecondOnBehalf,
} from "../../utils/screen-out-api";
import {
  ALREADY_COMPLETED,
  gotoSurface,
  openSurvey,
  personalLinkUrl,
  SURFACES,
  surveyRoot,
  type SurfaceKind,
  type SurveySurface,
} from "../../utils/survey-surface";

/** Sandbox setups. Add another entry to run the same flows under a different form setup. */
const SETUPS = [
  { label: "private one-per-user", ...PRIVATE_ONE_PER_USER },
] as const;

const JOHN = "AQ-000001-01";
const PORTLAND = "AQ-000002-01";
const GRACE = "AQ-000003-01";

const JOHN_NAME = "John Smith";
const JOHN_AGE = "65";
const JOHN_CITY = "03. MIDWEST - COLUMBUS";
const JOHN_VARS = {
  full_name: JOHN_NAME,
  age: 65,
  hometown: JOHN_CITY,
  panel_member: true,
} as const;

const GRACE_NAME = "Grace Hopper";
const GRACE_AGE = "17";
const GRACE_CITY = "05. SOUTH - AUSTIN";
const GRACE_VARS = {
  full_name: GRACE_NAME,
  age: 17,
  hometown: GRACE_CITY,
  panel_member: true,
} as const;

const WEAPON = "Pick your primary weapon";

type SubmissionState = {
  isComplete: boolean;
  collectionStatus?: string;
  jsonData: string;
  token: string;
  personalization?: { variables?: Record<string, unknown> } | null;
};

test.describe("All-questions personalization", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(180_000);

  test.beforeEach(() => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
  });

  for (const setup of SETUPS) {
    test.describe(setup.label, () => {
      for (const surface of SURFACES) {
        test.describe(surface, () => {
      test("personalized link: issued, opened in progress, used after complete", async ({
        page,
      }) => {
        const api = await requireApi();
        const form = await seedAllQuestionsForm(api, setup);
        await runForm(form, async () => {
          const tokens = await issueLinks(api, form.formId);

          await expectLinkStatus(api, form.formId, JOHN, AudienceLinkStatusKind.Issued);
          await expectLinkStatus(
            api,
            form.formId,
            PORTLAND,
            AudienceLinkStatusKind.Issued,
          );
          await expectLinkStatus(api, form.formId, GRACE, AudienceLinkStatusKind.Issued);

          const johnToken = tokens.get(JOHN);
          expect(johnToken, "John must have a personalized link").toBeTruthy();

          const opened = await openPersonalizedOnSurface(
            page,
            api,
            surface,
            form.formId,
            JOHN,
            johnToken!,
          );
          await expectAdultPersonalization(opened.survey, {
            name: JOHN_NAME,
            age: JOHN_AGE,
            city: JOHN_CITY,
            panelMember: true,
          });

          await expectOpenedLink(
            api,
            form.formId,
            JOHN,
            opened.submissionId,
          );
          await expectSubmissionState(api, form.formId, opened.submissionId, {
            isComplete: false,
            collectionStatus: "in_progress",
            personalization: JOHN_VARS,
          });
          await expectHexTokenAccepts(api, form.formId, opened.submissionId);
          await expectLinkStatus(
            api,
            form.formId,
            PORTLAND,
            AudienceLinkStatusKind.Issued,
          );

          await completeSurvey(opened.survey);
          await expectSubmissionState(api, form.formId, opened.submissionId, {
            isComplete: true,
            collectionStatus: "complete",
            personalization: JOHN_VARS,
          });
          await expectOpenedLink(
            api,
            form.formId,
            JOHN,
            opened.submissionId,
          );
          await expectHexTokenClosed(api, form.formId, opened.submissionId);

          const returned = await gotoSurface(
            page,
            surface,
            form.formId,
            opened.shareToken,
          );
          await expectThankYou(returned);

          const second = await trySecondOnBehalf(api, form.formId, JOHN);
          expect(second.success, "second on-behalf create must fail").toBe(false);
          await expectLinkStatus(
            api,
            form.formId,
            PORTLAND,
            AudienceLinkStatusKind.Issued,
          );
          await expectLinkStatus(api, form.formId, GRACE, AudienceLinkStatusKind.Issued);
        });
      });

      test("on-behalf: personalization, one-per-user, resume link", async ({
        page,
      }) => {
        const api = await requireApi();
        const form = await seedAllQuestionsForm(api, setup);
        await runForm(form, async () => {
          const tokens = await issueLinks(api, form.formId);
          await expectLinkStatus(api, form.formId, GRACE, AudienceLinkStatusKind.Issued);

          const created = await createOnBehalf(api, form.formId, GRACE);
          const shareToken = await createShareAccessToken(
            api,
            form.formId,
            created.submissionId,
          );

          // On-behalf creates the submission; it stays not_started until the respondent opens it.
          await expectSubmissionState(api, form.formId, created.submissionId, {
            isComplete: false,
            collectionStatus: "not_started",
            personalization: GRACE_VARS,
          });
          // On-behalf does not redeem the personalized link.
          await expectLinkStatus(api, form.formId, GRACE, AudienceLinkStatusKind.Issued);

          const survey = await openSurvey(
            page,
            surface,
            form.formId,
            shareToken,
          );
          await expectMinorPersonalization(survey);
          // Opening with a share token does not move collection status by itself.
          await expectSubmissionState(api, form.formId, created.submissionId, {
            isComplete: false,
            personalization: GRACE_VARS,
          });

          const second = await trySecondOnBehalf(api, form.formId, GRACE);
          expect(
            second.success,
            "limit one per user refuses a second submission",
          ).toBe(false);

          const graceToken = tokens.get(GRACE);
          expect(graceToken, "Grace must have a personalized link").toBeTruthy();
          // Redeem always runs on the personal-link Hub page; then reopen on this surface.
          await openPersonalLinkSurvey(page, form.formId, graceToken!);
          await expectOpenedLink(
            api,
            form.formId,
            GRACE,
            created.submissionId,
          );
          await expectSubmissionState(api, form.formId, created.submissionId, {
            isComplete: false,
            collectionStatus: "in_progress",
            personalization: GRACE_VARS,
          });

          const resumed = await openSurvey(
            page,
            surface,
            form.formId,
            shareToken,
          );
          await expectMinorPersonalization(resumed);
          await completeSurvey(resumed);

          await expectSubmissionState(api, form.formId, created.submissionId, {
            isComplete: true,
            collectionStatus: "complete",
            personalization: GRACE_VARS,
          });
          await expectOpenedLink(
            api,
            form.formId,
            GRACE,
            created.submissionId,
          );
          await expectHexTokenClosed(api, form.formId, created.submissionId);

          const returned = await gotoSurface(
            page,
            surface,
            form.formId,
            shareToken,
          );
          await expectThankYou(returned);
        });
      });
        });
      }
    });
  }
});

async function requireApi(): Promise<EndatixApi> {
  const api = await signInForAudience();
  if (!api) {
    throw new Error("E2E sign-in failed");
  }
  return api;
}

async function runForm(form: PanelForm, body: () => Promise<void>): Promise<void> {
  test.info().annotations.push({ type: "formId", description: form.formId });
  let failed = false;
  try {
    await body();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    const outcome = await form.release(
      failed || process.env.E2E_KEEP_DATA === "1",
    );
    test.info().annotations.push({
      type: "forms",
      description: `${outcome}: ${form.formId}`,
    });
  }
}

/**
 * Share: browser opens `/share/{formId}/a/{token}` (redeem + survey).
 * Iframe: redeem via API, mint a share token, open the embed host.
 */
async function openPersonalizedOnSurface(
  page: Page,
  api: EndatixApi,
  surface: SurfaceKind,
  formId: string,
  identifier: string,
  linkToken: string,
): Promise<{
  survey: SurveySurface;
  submissionId: string;
  shareToken: string;
}> {
  if (surface === "share") {
    const survey = await openPersonalLinkSurvey(page, formId, linkToken);
    const person = await personByIdentifier(api, formId, identifier);
    if (
      person.link.status !== AudienceLinkStatusKind.Opened ||
      !person.link.submissionId
    ) {
      throw new Error("Opening the personal link did not mark it opened");
    }
    const shareToken = await createShareAccessToken(
      api,
      formId,
      person.link.submissionId,
    );
    return {
      survey,
      submissionId: person.link.submissionId,
      shareToken,
    };
  }

  const redeemed = await redeem(api, formId, linkToken);
  const shareToken = await createShareAccessToken(
    api,
    formId,
    redeemed.submissionId,
  );
  const survey = await openSurvey(page, "iframe", formId, shareToken);
  return {
    survey,
    submissionId: redeemed.submissionId,
    shareToken,
  };
}

async function issueLinks(
  api: EndatixApi,
  formId: string,
): Promise<Map<string, string>> {
  const issued = await api.audience.generateLinks(formId);
  if (!issued.success) {
    throw new Error(`Generate links failed: ${issued.error.message}`);
  }
  const people = await listPeople(api, formId);
  const membershipToIdentifier = new Map(
    people.map((person) => [person.membershipId, person.identifier]),
  );
  const tokens = new Map<string, string>();
  for (const link of issued.data) {
    const identifier = membershipToIdentifier.get(link.membershipId);
    if (identifier) {
      tokens.set(identifier, link.token);
    }
  }
  expect(tokens.size, "every imported person gets a link").toBe(people.length);
  return tokens;
}

async function listPeople(
  api: EndatixApi,
  formId: string,
): Promise<readonly AudiencePerson[]> {
  const page = await api.audience.listPeople(formId, { pageSize: 50 });
  if (!page.success) {
    throw new Error(`List people failed: ${page.error.message}`);
  }
  return page.data.items;
}

async function personByIdentifier(
  api: EndatixApi,
  formId: string,
  identifier: string,
): Promise<AudiencePerson> {
  const people = await listPeople(api, formId);
  const person = people.find((row) => row.identifier === identifier);
  if (!person) {
    throw new Error(`Person ${identifier} not on the form`);
  }
  return person;
}

async function expectLinkStatus(
  api: EndatixApi,
  formId: string,
  identifier: string,
  status: AudiencePerson["link"]["status"],
): Promise<void> {
  await expect
    .poll(async () => (await personByIdentifier(api, formId, identifier)).link.status)
    .toBe(status);
}

async function expectOpenedLink(
  api: EndatixApi,
  formId: string,
  identifier: string,
  submissionId: string,
): Promise<void> {
  await expect.poll(async () => {
    const person = await personByIdentifier(api, formId, identifier);
    if (person.link.status !== AudienceLinkStatusKind.Opened) {
      return { status: person.link.status };
    }
    return {
      status: person.link.status,
      submissionId: person.link.submissionId,
      openedAt: person.link.openedAt,
    };
  }).toEqual({
    status: AudienceLinkStatusKind.Opened,
    submissionId,
    openedAt: expect.any(String),
  });
}

async function redeem(
  api: EndatixApi,
  formId: string,
  token: string,
): Promise<{ submissionId: string; submissionAccessToken: string }> {
  const redeemed = await api.audience.redeemLink(formId, token);
  if (!redeemed.success) {
    throw new Error(`Redeem link failed: ${redeemed.error.message}`);
  }
  expect(redeemed.data.created, "first redeem creates the submission").toBe(true);
  expect(redeemed.data.submissionId).toBeTruthy();
  expect(redeemed.data.submissionAccessToken).toBeTruthy();
  return {
    submissionId: redeemed.data.submissionId,
    submissionAccessToken: redeemed.data.submissionAccessToken,
  };
}

async function openPersonalLinkSurvey(
  page: Page,
  formId: string,
  token: string,
): Promise<SurveySurface> {
  await page.goto(personalLinkUrl(formId, token));
  await page.waitForURL(
    (url) =>
      url.pathname.endsWith(`/share/${formId}`) ||
      url.pathname.endsWith(`/share/${formId}/`),
    { timeout: 30_000 },
  );
  await page.locator(".sd-root-modern").waitFor({ timeout: 30_000 });
  return page;
}

function questionInput(survey: SurveySurface, title: string) {
  return surveyRoot(survey)
    .locator(".sd-question")
    .filter({ hasText: title })
    .locator("input")
    .first();
}

async function expectAdultPersonalization(
  survey: SurveySurface,
  person: {
    name: string;
    age: string;
    city: string;
    panelMember: boolean;
  },
): Promise<void> {
  const root = surveyRoot(survey);
  await expect(questionInput(survey, "Full Name")).toHaveValue(person.name);
  await expect(questionInput(survey, "Your Age")).toHaveValue(person.age);
  await expect(
    questionInput(survey, "Confirm the city you live in"),
  ).toHaveValue(person.city);
  await expect(
    root.getByText(`Anything else about life in ${person.city}?`),
  ).toBeVisible();
  await expectBoolean(survey, person.panelMember);
  await expect(root.getByText(WEAPON)).toBeVisible();
}

async function expectMinorPersonalization(survey: SurveySurface): Promise<void> {
  const root = surveyRoot(survey);
  await expect(questionInput(survey, "Full Name")).toHaveValue(GRACE_NAME);
  await expect(questionInput(survey, "Your Age")).toHaveValue(GRACE_AGE);
  await expect(
    questionInput(survey, "Confirm the city you live in"),
  ).toHaveValue(GRACE_CITY);
  await expect(
    root.getByText(`Anything else about life in ${GRACE_CITY}?`),
  ).toBeVisible();
  await expectBoolean(survey, true);
  await expect(root.getByText(WEAPON)).toHaveCount(0);
}

async function expectBoolean(
  survey: SurveySurface,
  checked: boolean,
): Promise<void> {
  const question = surveyRoot(survey)
    .locator(".sd-question")
    .filter({ hasText: "Do you agree to the terms?" });
  const bool = question.locator(".sd-boolean");
  if (checked) {
    await expect(bool).toHaveClass(/sd-boolean--(checked|true)/);
  } else {
    await expect(bool).not.toHaveClass(/sd-boolean--(checked|true)/);
  }
}

async function completeSurvey(survey: SurveySurface): Promise<void> {
  await surveyRoot(survey).getByRole("button", { name: "Complete" }).click();
  await survey.getByText("Thank you").waitFor({ timeout: 15_000 });
}

async function expectThankYou(surface: SurveySurface): Promise<void> {
  await expect(surface.getByText("Thank you")).toBeVisible({ timeout: 15_000 });
  await expect(surface.getByText(ALREADY_COMPLETED)).toBeVisible();
}

async function readSubmission(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<SubmissionState> {
  const read = await api.get<SubmissionState>(
    `/forms/${formId}/submissions/${submissionId}`,
  );
  if (!read.success) {
    throw new Error(`Read submission failed: ${read.error.message}`);
  }
  return read.data;
}

async function expectSubmissionState(
  api: EndatixApi,
  formId: string,
  submissionId: string,
  expected: {
    isComplete: boolean;
    collectionStatus?: string;
    personalization: Record<string, unknown>;
  },
): Promise<void> {
  await expect.poll(async () => {
    const submission = await readSubmission(api, formId, submissionId);
    const state: Record<string, unknown> = {
      isComplete: submission.isComplete,
      personalization: pickVars(
        submission.personalization?.variables,
        Object.keys(expected.personalization),
      ),
    };
    if (expected.collectionStatus !== undefined) {
      state.collectionStatus = submission.collectionStatus;
    }
    return state;
  }).toEqual({
    isComplete: expected.isComplete,
    personalization: expected.personalization,
    ...(expected.collectionStatus !== undefined
      ? { collectionStatus: expected.collectionStatus }
      : {}),
  });
}

function pickVars(
  variables: Record<string, unknown> | null | undefined,
  keys: string[],
): Record<string, unknown> {
  const source = variables ?? {};
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

async function expectHexTokenAccepts(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<void> {
  const submission = await readSubmission(api, formId, submissionId);
  const draft = await api.submissions.public.updateByToken(
    formId,
    submission.token,
    {
      jsonData: JSON.stringify({ note: "still open" }),
      isComplete: false,
    },
  );
  expect(draft.success, "in-progress token still accepts an answer").toBe(true);
  const after = await readSubmission(api, formId, submissionId);
  expect(JSON.parse(after.jsonData)).toMatchObject({ note: "still open" });
  expect(after.isComplete).toBe(false);
}

async function expectHexTokenClosed(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<void> {
  const submission = await readSubmission(api, formId, submissionId);
  const retry = await api.submissions.public.updateByToken(
    formId,
    submission.token,
    {
      jsonData: JSON.stringify({ note: "retry" }),
      isComplete: false,
    },
  );
  expect(retry.success, "token must not accept another answer").toBe(false);
}
