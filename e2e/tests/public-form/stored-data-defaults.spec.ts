import { expect, type Page, test } from "@playwright/test";
import type { EndatixApi } from "@/lib/endatix-api/endatix-api";
import { publishE2eForm } from "../../utils/form-api";
import { createShareAccessToken } from "../../utils/on-behalf-share";
import { runE2eForms } from "../../utils/run-e2e-form";
import {
  e2eCredentials,
  releaseE2eForms,
  signInE2eApi,
} from "../../utils/screen-out-api";
import {
  openSurvey,
  questionInput,
  surveyRoot,
  type SurveySurface,
} from "../../utils/survey-surface";

/**
 * endatix/endatix-hub#1456: a share link to an on-behalf submission whose stored data holds only a prefill
 * keeps the values the form sets with defaultValueExpression, also after a reload before Next.
 */

const LOOP_FORM = {
  pages: [
    { elements: [{ type: "text", name: "Q1", title: "Any answer" }] },
    {
      elements: [
        {
          type: "checkbox",
          name: "DUMMY",
          visible: false,
          clearIfInvisible: "none",
          defaultValueExpression: "['B','A','C']",
          choices: [
            { value: "A", text: "Statement A" },
            { value: "B", text: "Statement B" },
            { value: "C", text: "Statement C" },
          ],
        },
        {
          type: "paneldynamic",
          name: "LOOP",
          titleLocation: "hidden",
          isRequired: true,
          displayMode: "list",
          allowAddPanel: false,
          allowRemovePanel: false,
          loopSource: ["DUMMY"],
          templateElements: [
            {
              type: "radiogroup",
              name: "R",
              title: "{panel.itemText}",
              choices: [1, 2, 3],
            },
          ],
        },
      ],
    },
  ],
};

const RANKING_FORM = {
  calculatedValues: [{ name: "c_n", expression: "4" }],
  pages: [
    {
      elements: [
        {
          type: "checkbox",
          name: "SRC",
          title: "Occasions",
          clearIfInvisible: "none",
          defaultValueExpression: "iif({c_n} = 4, [1,2,3,4], [1])",
          choices: [1, 2, 3, 4, 5].map((n) => ({
            value: n,
            text: `Occasion ${n}`,
          })),
        },
      ],
    },
    {
      elements: [
        {
          type: "ranking",
          name: "RANK",
          title: "Rank them",
          choicesFromQuestion: "SRC",
          choicesFromQuestionMode: "selected",
          selectToRankEnabled: true,
        },
      ],
    },
  ],
};

test.describe("Defaults on a stored submission", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  let api: EndatixApi;

  test.beforeAll(async () => {
    // Each case seeds a form and an on-behalf submission through the API: without Hub credentials there is nothing to call.
    test.skip(!e2eCredentials(), "Set E2E_EMAIL and E2E_PASSWORD.");
    api = await signInE2eApi();
  });

  test("a loop over a defaulted source lists its items after a reload before Next", async ({
    page,
  }) => {
    await onPrefilledShareLink(
      { page, api, definition: LOOP_FORM },
      async ({ survey, saved }) => {
        // SurveyJS stores a text answer when the input loses focus.
        await questionInput(survey, "Any answer").fill("x");
        await questionInput(survey, "Any answer").press("Tab");
        await saved((data) => data.Q1 === "x");

        const resumed = await reloadSurvey(page, survey);
        await expect(questionInput(resumed, "Any answer")).toHaveValue("x");
        await next(resumed);

        const root = surveyRoot(resumed);
        await expect(root.getByText("No entries")).toHaveCount(0);
        for (const item of ["Statement A", "Statement B", "Statement C"]) {
          await expect(root.getByText(item)).toBeVisible();
        }
      },
    );
  });

  test("a ranking copying a defaulted question offers the saved choices after a reload before Next", async ({
    page,
  }) => {
    await onPrefilledShareLink(
      { page, api, definition: RANKING_FORM },
      async ({ survey, saved }) => {
        // The respondent unticks one defaulted choice; the saved partial must win over the default on resume.
        await surveyRoot(survey)
          .getByText("Occasion 2", { exact: true })
          .click();
        await saved(
          (data) => JSON.stringify(data.SRC) === JSON.stringify([1, 3, 4]),
        );

        const resumed = await reloadSurvey(page, survey);
        await expect(occasion(resumed, 2)).not.toBeChecked();
        await expect(occasion(resumed, 3)).toBeChecked();
        await next(resumed);

        const ranking = surveyRoot(resumed)
          .locator(".sd-question")
          .filter({ hasText: "Rank them" });
        for (const n of [1, 3, 4]) {
          await expect(ranking.getByText(`Occasion ${n}`)).toBeVisible();
        }
        for (const n of [2, 5]) {
          await expect(ranking.getByText(`Occasion ${n}`)).toHaveCount(0);
        }
      },
    );
  });
});

type StoredData = Record<string, unknown>;
type OpenedLink = {
  survey: SurveySurface;
  /** Waits until the submission's saved data matches. */
  saved: (matches: (data: StoredData) => boolean) => Promise<void>;
};

/** Publishes the form, creates an on-behalf submission holding only `{"panelistId"}`, and opens its share link. */
async function onPrefilledShareLink(
  {
    page,
    api,
    definition,
  }: { page: Page; api: EndatixApi; definition: object },
  body: (opened: OpenedLink) => Promise<void>,
): Promise<void> {
  const formId = await publishE2eForm(api, {
    name: `e2e stored-data defaults ${Date.now()}`,
    definitionJson: JSON.stringify(definition),
    isPublic: true,
    limitOnePerUser: false,
  });
  await runE2eForms(
    [formId],
    (keep) => releaseE2eForms(api, [formId], keep),
    async () => {
      const created = await api.post<{ id: string }>(
        `/forms/${formId}/submissions/onbehalf`,
        {
          isComplete: false,
          jsonData: JSON.stringify({ panelistId: "p-0001" }),
          submitter: { externalSubjectId: `e2e-defaults-${formId}` },
        },
      );
      if (!created.success) {
        throw new Error(`On-behalf create failed: ${created.error.message}`);
      }
      const token = await createShareAccessToken(api, formId, created.data.id);
      const submissionId = created.data.id;
      await body({
        survey: await openSurvey(page, "share", formId, token),
        saved: (matches) =>
          waitForSaved(api, { formId, submissionId }, matches),
      });
    },
  );
}

async function reloadSurvey(
  page: Page,
  survey: SurveySurface,
): Promise<SurveySurface> {
  await page.waitForLoadState("networkidle");
  await page.reload();
  await surveyRoot(survey).waitFor({ timeout: 30_000 });
  return page;
}

async function next(survey: SurveySurface): Promise<void> {
  await surveyRoot(survey).getByRole("button", { name: "Next" }).click();
}

function occasion(survey: SurveySurface, n: number) {
  return surveyRoot(survey).getByRole("checkbox", { name: `Occasion ${n}` });
}

async function waitForSaved(
  api: EndatixApi,
  { formId, submissionId }: { formId: string; submissionId: string },
  matches: (data: StoredData) => boolean,
): Promise<void> {
  const deadline = Date.now() + 20_000;
  let last = "";
  while (Date.now() < deadline) {
    const read = await api.get<{ jsonData: string }>(
      `/forms/${formId}/submissions/${submissionId}`,
    );
    if (!read.success) {
      throw new Error(`Read submission failed: ${read.error.message}`);
    }
    last = read.data.jsonData;
    if (matches(JSON.parse(last || "{}") as StoredData)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Saved data never matched; last saw ${last}`);
}
