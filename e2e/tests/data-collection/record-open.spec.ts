import { expect, type Page, test } from "@playwright/test";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import type { Submission } from "@/lib/endatix-api";
import { publishE2eForm } from "../../utils/form-api";
import { createOnBehalfShare } from "../../utils/on-behalf-share";
import { playgroundEmbedHostHref } from "../../utils/open-embed-host";
import { runE2eForms } from "../../utils/run-e2e-form";
import {
  e2eCredentials,
  releaseE2eForms,
  signInE2eApi,
} from "../../utils/screen-out-api";
import {
  embedHostOrigin,
  hubBaseUrl,
  openSurvey,
  personalLinkUrl,
  questionInput,
  SURFACES,
  surfaceOf,
  surveyRoot,
  type SurfaceKind,
  type SurveySurface,
} from "../../utils/survey-surface";

/**
 * endatix/endatix#1100: a submission's start is the respondent's first open. Every way a respondent reaches
 * the form records the open the same way: the first open leaves one `viewed` submission with `startedAt`, the
 * first answer moves that same submission to `in_progress` with `startedAt` unchanged, and a reload resumes it.
 */

const QUESTION = "Your name";
const DEFINITION = JSON.stringify({
  pages: [
    {
      name: "page1",
      elements: [{ type: "text", name: "q1", title: QUESTION }],
    },
  ],
});
const VISIBILITIES = ["public", "private"] as const;
type Visibility = (typeof VISIBILITIES)[number];

/** How the respondent arrives: no token, a share link (on-behalf + `submit` token), or a personal link. */
type Entry = "anonymous" | "share link" | "personal link";

type Opened = {
  formId: string;
  surface: SurveySurface;
  reload: () => Promise<SurveySurface>;
};

test.describe("Record the respondent's open", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  let api: EndatixApi;

  test.beforeAll(async () => {
    // Every case seeds forms and reads submissions through the API: without Hub credentials there is nothing to call.
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
    api = await signInE2eApi();
  });

  for (const visibility of VISIBILITIES) {
    for (const surface of SURFACES) {
      test.describe(`${visibility} form, ${surface}`, () => {
        if (visibility === "public") {
          test("anonymous: the open creates one viewed submission, the answer starts it, a reload resumes it", async ({
            page,
          }) => {
            await recordsTheOpen(page, api, visibility, surface, "anonymous");
          });
        } else {
          test("anonymous: asked to sign in, so the form never shows and nothing is recorded", async ({
            page,
          }) => {
            await refusesAnonymousOnPrivateForm(page, api, surface);
          });
        }

        test("share link: the open moves the on-behalf submission to viewed, the answer starts it, a reload resumes it", async ({
          page,
        }) => {
          await recordsTheOpen(page, api, visibility, surface, "share link");
        });

        test("personal link: the open records the start, the answer starts it, a reload resumes it", async ({
          page,
        }) => {
          await recordsTheOpen(page, api, visibility, surface, "personal link");
        });
      });
    }
  }
});

async function recordsTheOpen(
  page: Page,
  api: EndatixApi,
  visibility: Visibility,
  kind: SurfaceKind,
  entry: Entry,
): Promise<void> {
  const formId = await publishForm(api, visibility, `${entry} ${kind}`);
  await runE2eForms(
    [formId],
    (keep) => releaseE2eForms(api, [formId], keep),
    async () => {
      const opened = await openEntry(page, api, formId, kind, entry);

      // 1. The open, before any answer: one submission, viewed, with its start.
      const first = await waitForOnly(
        api,
        formId,
        (s) => s.collectionStatus === "viewed" && Boolean(s.startedAt),
      );
      expect(first.isComplete).toBe(false);

      // 2. The first answer: the same submission moves to in_progress, its start unchanged.
      // SurveyJS stores a text answer when the input loses focus.
      await questionInput(opened.surface, QUESTION).fill("Ada");
      await questionInput(opened.surface, QUESTION).press("Tab");
      const answered = await waitForOnly(
        api,
        formId,
        (s) => s.collectionStatus === "in_progress",
      );
      expect(answered.id).toBe(first.id);
      expect(answered.startedAt).toBe(first.startedAt);

      // 3. A reload resumes the same submission: the answer is back and no second submission appears.
      const reopened = await opened.reload();
      await expect(questionInput(reopened, QUESTION)).toHaveValue("Ada");
      const resumed = await waitForOnly(
        api,
        formId,
        (s) => s.collectionStatus === "in_progress",
      );
      expect(resumed.id).toBe(first.id);
      expect(resumed.startedAt).toBe(first.startedAt);
    },
  );
}

async function refusesAnonymousOnPrivateForm(
  page: Page,
  api: EndatixApi,
  kind: SurfaceKind,
): Promise<void> {
  const formId = await publishForm(api, "private", `anonymous ${kind}`);
  await runE2eForms(
    [formId],
    (keep) => releaseE2eForms(api, [formId], keep),
    async () => {
      const surface = await gotoAnonymous(page, kind, formId);
      // A private form asks an anonymous visitor to sign in, on the share page and in the iframe alike.
      await expect(surface.getByText("Sign in required")).toBeVisible({
        timeout: 30_000,
      });
      await expect(surveyRoot(surface)).toHaveCount(0);
      expect(await listSubmissions(api, formId)).toHaveLength(0);
    },
  );
}

async function publishForm(
  api: EndatixApi,
  visibility: Visibility,
  label: string,
): Promise<string> {
  return publishE2eForm(api, {
    name: `e2e record open ${visibility} ${label} ${Date.now()}`,
    definitionJson: DEFINITION,
    isPublic: visibility === "public",
    limitOnePerUser: false,
  });
}

/** Opens the form the way the entry arrives, and returns how to reload that same view. */
async function openEntry(
  page: Page,
  api: EndatixApi,
  formId: string,
  kind: SurfaceKind,
  entry: Entry,
): Promise<Opened> {
  if (entry === "anonymous") {
    const surface = await gotoAnonymous(page, kind, formId);
    await surveyRoot(surface).waitFor({ timeout: 30_000 });
    return { formId, surface, reload: () => reloadSurface(page, kind, formId) };
  }

  const token =
    entry === "share link"
      ? await shareLinkToken(api, formId)
      : await personalLinkToken(api, formId, kind);
  if (entry === "personal link" && kind === "share") {
    await page.goto(personalLinkUrl(formId, token));
    await page.waitForURL(new RegExp(`/share/${formId}(\\?|$)`));
    await surveyRoot(page).waitFor({ timeout: 30_000 });
    return {
      formId,
      surface: page,
      reload: () => reloadSurface(page, kind, formId),
    };
  }

  const surface = await openSurvey(page, kind, formId, token);
  return { formId, surface, reload: () => reloadSurface(page, kind, formId) };
}

async function gotoAnonymous(
  page: Page,
  kind: SurfaceKind,
  formId: string,
): Promise<SurveySurface> {
  if (kind === "share") {
    await page.goto(new URL(`/share/${formId}`, hubBaseUrl()).toString());
  } else {
    await page.goto(
      playgroundEmbedHostHref(embedHostOrigin(), formId, hubBaseUrl()),
    );
  }
  return surfaceOf(page, kind, formId);
}

async function reloadSurface(
  page: Page,
  kind: SurfaceKind,
  formId: string,
): Promise<SurveySurface> {
  await page.reload();
  const surface = surfaceOf(page, kind, formId);
  await surveyRoot(surface).waitFor({ timeout: 30_000 });
  return surface;
}

/** An on-behalf submission (not_started) and its share link's `submit` access token. */
async function shareLinkToken(
  api: EndatixApi,
  formId: string,
): Promise<string> {
  const share = await createOnBehalfShare(api, formId, `e2e-open-${formId}`);
  const [created] = await listSubmissions(api, formId);
  expect(created.collectionStatus).toBe("not_started");
  expect(created.startedAt ?? null).toBeNull();
  return share.shareToken;
}

/**
 * A person's personal link. The share page opens the link itself; an iframe can't, so (as the Hub's embed
 * flow does) it redeems the link through the API and embeds the submission's access token.
 */
async function personalLinkToken(
  api: EndatixApi,
  formId: string,
  kind: SurfaceKind,
): Promise<string> {
  const person = await api.audience.createPerson(formId, {
    identifier: `e2e-open-${formId}@example.com`,
  });
  if (!person.success) {
    throw new Error(`Create person failed: ${person.error.message}`);
  }
  const issued = await api.audience.generateLinks(formId);
  if (!issued.success || issued.data.length !== 1) {
    throw new Error("Generate links failed.");
  }
  const linkToken = issued.data[0].token;
  if (kind === "share") {
    return linkToken;
  }
  const redeemed = await api.audience.redeemLink(formId, linkToken);
  if (!redeemed.success) {
    throw new Error(`Redeem link failed: ${redeemed.error.message}`);
  }
  return redeemed.data.submissionAccessToken;
}

async function listSubmissions(
  api: EndatixApi,
  formId: string,
): Promise<Submission[]> {
  const listed = await api.submissions.list(formId, { pageSize: 50 });
  if (!listed.success) {
    throw new Error(`List submissions failed: ${listed.error.message}`);
  }
  return listed.data.items;
}

/** Waits until the form has exactly one submission and it matches; fails with what it last saw. */
async function waitForOnly(
  api: EndatixApi,
  formId: string,
  matches: (submission: Submission) => boolean,
): Promise<Submission> {
  const deadline = Date.now() + 20_000;
  let last: Submission[] = [];
  while (Date.now() < deadline) {
    last = await listSubmissions(api, formId);
    if (last.length === 1 && matches(last[0])) {
      return last[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const seen = last.map(
    (s) => `${s.id}:${s.collectionStatus}:${s.startedAt ?? "no start"}`,
  );
  throw new Error(
    `Expected one matching submission on form ${formId}; saw [${seen.join(", ")}]`,
  );
}
