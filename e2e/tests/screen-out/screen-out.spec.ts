import { expect, type FrameLocator, type Page, test } from "@playwright/test";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import {
  createOnBehalf,
  releaseScreenOutForms,
  e2eCredentials,
  readCollectionStatus,
  seedScreenOutForm,
  signInE2eApi,
  trySecondOnBehalf,
  type ScreenOutForm,
} from "../../utils/screen-out-api";
import { playgroundEmbedHostHref } from "../../utils/open-embed-host";

type SurveySurface = Page | FrameLocator;
type SurfaceKind = "share" | "iframe";

const SURFACES: readonly SurfaceKind[] = ["share", "iframe"];

test.describe("Screen-out", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  let api: EndatixApi;

  test.beforeAll(async () => {
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
    api = await signInE2eApi();
  });

  for (const surface of SURFACES) {
    test.describe(surface, () => {
      test("private one-per-user with-access-token locks after screen-out and after complete", async ({
        page,
      }) => {
        const screened = await seedScreenOutForm(api, {
          isPublic: false,
          limitOnePerUser: true,
        });
        const completed = await seedScreenOutForm(api, {
          isPublic: false,
          limitOnePerUser: true,
        });

        const formIds = [screened.formId, completed.formId];
        annotateForms(formIds);
        let failed = false;
        try {
          const draft = await api.submissions.public.updateByToken(
            screened.formId,
            screened.token,
            {
              jsonData: JSON.stringify({ note: "still open" }),
              isComplete: false,
            },
          );
          expect(
            draft.success,
            "in-progress token still accepts an answer",
          ).toBe(true);

          await answerAge(page, surface, screened, "Under 18");
          await expectStatus(api, screened, "screen_out");
          await expectLocked(api, screened);
          await expectReloadedCopy(
            page,
            surface,
            "This response is closed and cannot be continued.",
          );

          await answerAge(page, surface, completed, "18 or older");
          await expectStatus(api, completed, "complete");
          await expectLocked(api, completed);
          await expectReloadedCopy(
            page,
            surface,
            "This form has already been completed.",
          );
        } catch (error) {
          failed = true;
          throw error;
        } finally {
          await releaseForms(api, formIds, failed);
        }
      });

      test("public with-access-token screens out and closes the token", async ({
        page,
      }) => {
        const seeded = await seedScreenOutForm(api, {
          isPublic: true,
          limitOnePerUser: false,
        });
        await runSeeded(api, seeded, async () => {
          await answerAge(page, surface, seeded, "Under 18");
          await expectStatus(api, seeded, "screen_out");
          await expectTokenClosed(api, seeded);

          const second = await createOnBehalf(
            api,
            seeded.formId,
            seeded.submitterId,
          );
          expect(second.token, "public forms cannot be one-per-user").not.toBe(
            seeded.token,
          );
        });
      });

      test("private with-access-token keeps Next when navigation replacement is off", async ({
        page,
      }) => {
        const seeded = await seedScreenOutForm(api, {
          isPublic: false,
          limitOnePerUser: false,
          changeNavigationOnComplete: false,
        });
        await runSeeded(api, seeded, async () => {
          const survey = await openSurvey(page, surface, seeded);
          const root = survey.locator(".sd-root-modern");
          await root.waitFor({ timeout: 30_000 });
          await root.getByText("Under 18", { exact: true }).click();

          await expect(
            root.getByRole("button", { name: "Next" }),
          ).toBeVisible();
          await expect(
            root.getByRole("button", { name: "Complete" }),
          ).toHaveCount(0);

          await root.getByRole("button", { name: "Next" }).click();
          await survey
            .getByText("Thanks for your interest")
            .waitFor({ timeout: 15_000 });
          await expectStatus(api, seeded, "screen_out");
          await expectTokenClosed(api, seeded);
        });
      });

      test("private with-access-token allows another submission after screen-out", async ({
        page,
      }) => {
        const seeded = await seedScreenOutForm(api, {
          isPublic: false,
          limitOnePerUser: false,
        });
        await runSeeded(api, seeded, async () => {
          await answerAge(page, surface, seeded, "Under 18");
          await expectStatus(api, seeded, "screen_out");

          const again = await api.submissions.public.updateByToken(
            seeded.formId,
            seeded.token,
            {
              jsonData: JSON.stringify({ age: "18_or_over" }),
              isComplete: false,
            },
          );
          expect(again.success, "screened-out token stays closed").toBe(false);

          const second = await createOnBehalf(
            api,
            seeded.formId,
            seeded.submitterId,
          );
          expect(second.token).not.toBe(seeded.token);
        });
      });
    });
  }
});

function annotateForms(formIds: string[]): void {
  for (const formId of formIds) {
    test.info().annotations.push({ type: "formId", description: formId });
  }
}

async function releaseForms(
  api: EndatixApi,
  formIds: string[],
  failed: boolean,
): Promise<void> {
  const outcome = await releaseScreenOutForms(
    api,
    formIds,
    failed || process.env.E2E_KEEP_DATA === "1",
  );
  test.info().annotations.push({
    type: "forms",
    description: `${outcome}: ${formIds.join(", ")}`,
  });
}

async function runSeeded(
  api: EndatixApi,
  seeded: ScreenOutForm,
  body: () => Promise<void>,
): Promise<void> {
  annotateForms([seeded.formId]);
  let failed = false;
  try {
    await body();
  } catch (error) {
    failed = true;
    throw error;
  } finally {
    await releaseForms(api, [seeded.formId], failed);
  }
}

function hubBaseUrl(): string {
  return process.env.BASE_URL ?? "http://localhost:3000";
}

function embedHostOrigin(): string {
  return process.env.E2E_EMBED_HOST_URL ?? "http://localhost:5000";
}

function shareUrl(seeded: ScreenOutForm): string {
  return `${hubBaseUrl()}/share/${seeded.formId}?token=${encodeURIComponent(seeded.shareToken)}`;
}

async function openSurvey(
  page: Page,
  kind: SurfaceKind,
  seeded: ScreenOutForm,
): Promise<SurveySurface> {
  if (kind === "share") {
    await page.goto(shareUrl(seeded));
    return page;
  }

  await page.goto(
    playgroundEmbedHostHref(
      embedHostOrigin(),
      seeded.formId,
      hubBaseUrl(),
      seeded.shareToken,
    ),
  );
  return page.frameLocator(`iframe[id^="edxf-${seeded.formId}"]`);
}

async function answerAge(
  page: Page,
  kind: SurfaceKind,
  seeded: ScreenOutForm,
  choice: string,
): Promise<void> {
  const surface = await openSurvey(page, kind, seeded);
  // Scope to SurveyJS. A loose /next/i matches the Next.js dev toolbar.
  const survey = surface.locator(".sd-root-modern");
  await survey.waitFor({ timeout: 30_000 });
  await survey.getByText(choice, { exact: true }).click();

  if (choice === "Under 18") {
    await survey.getByRole("button", { name: "Complete" }).click();
    await surface
      .getByText("Thanks for your interest")
      .waitFor({ timeout: 15_000 });
    return;
  }

  await survey.getByRole("button", { name: "Next" }).click();
  await survey.getByText("Wine", { exact: true }).click();
  await survey.getByRole("button", { name: "Complete" }).click();
  await surface.getByText("Thank you").waitFor({ timeout: 15_000 });
}

async function expectStatus(
  api: EndatixApi,
  seeded: ScreenOutForm,
  status: string,
): Promise<void> {
  await expect
    .poll(() => readCollectionStatus(api, seeded.formId, seeded.submissionId))
    .toBe(status);
}

async function expectTokenClosed(
  api: EndatixApi,
  seeded: ScreenOutForm,
): Promise<void> {
  const retry = await api.submissions.public.updateByToken(
    seeded.formId,
    seeded.token,
    {
      jsonData: JSON.stringify({ age: "18_or_over" }),
      isComplete: false,
    },
  );
  expect(retry.success, "token must not accept another answer").toBe(false);
}

async function expectReloadedCopy(
  page: Page,
  kind: SurfaceKind,
  message: string,
): Promise<void> {
  await page.reload();
  const surface: SurveySurface =
    kind === "share" ? page : page.frameLocator('iframe[id^="edxf-"]');
  await surface.getByText(message, { exact: true }).waitFor({
    timeout: 15_000,
  });
}

async function expectLocked(
  api: EndatixApi,
  seeded: ScreenOutForm,
): Promise<void> {
  await expectTokenClosed(api, seeded);
  const second = await trySecondOnBehalf(
    api,
    seeded.formId,
    seeded.submitterId,
  );
  expect(second.success, "second on-behalf create must fail").toBe(false);
}
