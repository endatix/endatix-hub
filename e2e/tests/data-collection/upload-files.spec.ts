import path from "node:path";
import { expect, type FrameLocator, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { playgroundEmbedHostHref } from "../../utils/open-embed-host";
import {
  createOnBehalf,
  createShareAccessToken,
  deleteForm,
  e2eCredentials,
  releaseScreenOutForms,
  signInE2eApi,
} from "../../utils/screen-out-api";

type SurveySurface = Page | FrameLocator;
type SurfaceKind = "share" | "iframe";

const SURFACES: readonly SurfaceKind[] = ["share", "iframe"];
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
        let failed = false;
        try {
          await uploadAndExpectResize(page, surface, seeded, api);
        } catch (error) {
          failed = true;
          throw error;
        } finally {
          await releaseScreenOutForms(
            api,
            [seeded.formId],
            failed || process.env.E2E_KEEP_DATA === "1",
          );
        }
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
  const created = await api.forms.create({
    name: `e2e image resize ${Date.now()}`,
    isEnabled: true,
    formDefinitionJsonData: "{}",
  });
  if (!created.success) {
    throw new Error(`Create form failed: ${created.error.message}`);
  }

  const formId = created.data.id;
  try {
    const published = await api.put(`/forms/${formId}/definition`, {
      isDraft: false,
      jsonData: FILE_FORM,
    });
    if (!published.success) {
      throw new Error(`Publish definition failed: ${published.error.message}`);
    }

    const updated = await api.forms.update(formId, { isPublic: true });
    if (!updated.success) {
      throw new Error(`Update form failed: ${updated.error.message}`);
    }

    const submitterId = `e2e-${formId}`;
    const submission = await createOnBehalf(api, formId, submitterId);
    const shareToken = await createShareAccessToken(
      api,
      formId,
      submission.submissionId,
    );
    return { formId, submissionId: submission.submissionId, shareToken };
  } catch (error) {
    await deleteForm(api, formId);
    throw error;
  }
}

function hubBaseUrl(): string {
  return process.env.BASE_URL ?? "http://localhost:3000";
}

async function openSurvey(
  page: Page,
  kind: SurfaceKind,
  seeded: SeededForm,
): Promise<SurveySurface> {
  if (kind === "share") {
    await page.goto(
      `${hubBaseUrl()}/share/${seeded.formId}?token=${encodeURIComponent(seeded.shareToken)}`,
    );
    return page;
  }

  const embedHost = process.env.E2E_EMBED_HOST_URL ?? "http://localhost:5000";
  await page.goto(
    playgroundEmbedHostHref(
      embedHost,
      seeded.formId,
      hubBaseUrl(),
      seeded.shareToken,
    ),
  );
  return page.frameLocator(`iframe[id^="edxf-${seeded.formId}"]`);
}

async function uploadAndExpectResize(
  page: Page,
  kind: SurfaceKind,
  seeded: SeededForm,
  api: EndatixApi,
): Promise<void> {
  const surface = await openSurvey(page, kind, seeded);
  const survey = surface.locator(".sd-root-modern");
  await survey.waitFor({ timeout: 30_000 });

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
