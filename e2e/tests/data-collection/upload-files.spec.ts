import path from "node:path";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { publishE2eForm } from "../../utils/form-api";
import { createOnBehalfShare } from "../../utils/on-behalf-share";
import { runE2eForms } from "../../utils/run-e2e-form";
import {
  e2eCredentials,
  releaseE2eForms,
  signInE2eApi,
} from "../../utils/screen-out-api";
import {
  openSurvey,
  surveyRoot,
  SURFACES,
  type SurfaceKind,
} from "../../utils/survey-surface";

const FIXTURE_PATH = path.join(
  process.cwd(),
  "e2e/fixtures/wide-landscape.jpg",
);
const DEFAULT_RESIZE_WIDTH = 800;

const FILE_FORM = JSON.stringify({
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "file",
          name: "photo",
          title: "Photo",
          acceptedTypes: "image/jpeg",
          storeDataAsText: false,
          waitForUpload: true,
        },
      ],
    },
  ],
});

test.describe("Upload files", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  let api: EndatixApi;

  test.beforeAll(async () => {
    // Local runs without Hub credentials skip; CI sets E2E_EMAIL and E2E_PASSWORD.
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
    api = await signInE2eApi();
  });

  for (const surface of SURFACES) {
    test.describe(surface, () => {
      test("file upload is resized before it is stored", async ({ page }) => {
        const seeded = await seedFileForm(api);
        await runE2eForms(
          [seeded.formId],
          (keep) => releaseE2eForms(api, [seeded.formId], keep),
          () => uploadAndExpectResize(page, surface, seeded, api),
        );
      });
    });
  }
});

type SeededForm = {
  formId: string;
  submissionId: string;
  shareToken: string;
};

async function seedFileForm(api: EndatixApi): Promise<SeededForm> {
  const formId = await publishE2eForm(api, {
    name: `e2e image resize ${Date.now()}`,
    definitionJson: FILE_FORM,
    isPublic: true,
    limitOnePerUser: false,
  });
  const submission = await createOnBehalfShare(api, formId, `e2e-${formId}`);
  return {
    formId,
    submissionId: submission.submissionId,
    shareToken: submission.shareToken,
  };
}

async function uploadAndExpectResize(
  page: Page,
  kind: SurfaceKind,
  seeded: SeededForm,
  api: EndatixApi,
): Promise<void> {
  const surface = await openSurvey(page, kind, seeded.formId, seeded.shareToken);
  const survey = surveyRoot(surface);

  const original = await sharp(FIXTURE_PATH).metadata();
  expect(original.width, "fixture is wider than the resize target").toBeGreaterThan(
    DEFAULT_RESIZE_WIDTH,
  );

  const resizeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/public/v0/storage/resize-image") &&
      response.request().method() === "POST",
  );
  const uploadResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/storage/upload-urls") &&
      response.request().method() === "POST",
  );

  // SurveyJS attaches the input's change handler only when Select File is clicked.
  const fileChooser = page.waitForEvent("filechooser");
  await survey.getByLabel("Select File", { exact: true }).click();
  await (await fileChooser).setFiles(FIXTURE_PATH);

  const resized = await resizeResponse;
  const resizedBytes = Buffer.from(await resized.body());
  expect(resized.status(), resizedBytes.subarray(0, 180).toString("utf8")).toBe(
    200,
  );
  const resizedImage = await sharp(resizedBytes).metadata();
  expect(resizedImage.width).toBeLessThanOrEqual(DEFAULT_RESIZE_WIDTH);
  expect(resizedImage.width).toBeLessThan(original.width ?? 0);

  const uploaded = await uploadResponse;
  expect(uploaded.ok(), "resized bytes were accepted for storage").toBe(true);

  const fileLink = survey.getByRole("link", { name: "wide-landscape.jpg" });
  await expect(fileLink).toBeVisible({ timeout: 30_000 });

  await survey.getByRole("button", { name: "Complete" }).click();
  await surface
    .getByText("Thank you for completing the survey")
    .waitFor({ timeout: 30_000 });

  const storedUrl = await readStoredImageUrl(
    api,
    seeded.formId,
    seeded.submissionId,
  );
  expect(storedUrl).toMatch(/^https:\/\//);
}

async function readStoredImageUrl(
  api: EndatixApi,
  formId: string,
  submissionId: string,
): Promise<string> {
  const submission = await api.get<{ jsonData?: string }>(
    `/forms/${formId}/submissions/${submissionId}`,
  );
  if (!submission.success) {
    throw new Error(`Read submission failed: ${submission.error.message}`);
  }

  const answers = JSON.parse(submission.data.jsonData ?? "{}") as {
    photo?: { content?: string }[];
  };
  const content = answers.photo?.[0]?.content;
  if (!content) {
    throw new Error("Submission json has no photo content URL.");
  }
  return content;
}
