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
      async (survey) => {
        await questionInput(survey, "Any answer").fill("x");
        const resumed = await reloadSurvey(page, survey);
        await questionInput(resumed, "Any answer").fill("x");
        await next(resumed);

        const root = surveyRoot(resumed);
        await expect(root.getByText("No entries")).toHaveCount(0);
        for (const item of ["Statement A", "Statement B", "Statement C"]) {
          await expect(root.getByText(item)).toBeVisible();
        }
      },
    );
  });

  test("a ranking copying a defaulted question offers its choices after a reload before Next", async ({
    page,
  }) => {
    await onPrefilledShareLink(
      { page, api, definition: RANKING_FORM },
      async (survey) => {
        const resumed = await reloadSurvey(page, survey);
        await next(resumed);

        const ranking = surveyRoot(resumed)
          .locator(".sd-question")
          .filter({ hasText: "Rank them" });
        for (const n of [1, 2, 3, 4]) {
          await expect(ranking.getByText(`Occasion ${n}`)).toBeVisible();
        }
        await expect(ranking.getByText("Occasion 5")).toHaveCount(0);
      },
    );
  });
});

/** Publishes the form, creates an on-behalf submission holding only `{"panelistId"}`, and opens its share link. */
async function onPrefilledShareLink(
  {
    page,
    api,
    definition,
  }: { page: Page; api: EndatixApi; definition: object },
  body: (survey: SurveySurface) => Promise<void>,
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
      await body(await openSurvey(page, "share", formId, token));
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
