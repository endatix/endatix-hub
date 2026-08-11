import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, QuestionDropdownModel } from "survey-core";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { clearChoicesLazyLoadGuardsForTests } from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { clearDataListDisplayValuesCacheForTests } from "../../use-cases/resolve-data-list-display-values";
import { registerDataListGlobals } from "../registry";
import { bindDataListsToSurvey } from "../survey-bindings";

const { searchMock, getDisplayValuesMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  getDisplayValuesMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: () => ({
    dataLists: {
      search: searchMock,
      getDisplayValues: getDisplayValuesMock,
    },
  }),
}));

vi.mock("@/lib/form-runtime/form-access-jwt-orchestrator", () => ({
  ensureRuntimeFormAccessJwt: vi.fn().mockResolvedValue("test-form-access-jwt"),
  invalidateRuntimeFormAccessJwt: vi.fn(),
}));

describe("bindDataListsToSurvey", () => {
  beforeEach(() => {
    clearChoicesLazyLoadGuardsForTests();
    clearDataListDisplayValuesCacheForTests();
    searchMock.mockReset();
    getDisplayValuesMock.mockReset();
    searchMock.mockResolvedValue(
      ApiResult.success({
        page: 1,
        pageSize: 25,
        totalRecords: 0,
        totalPages: 0,
        items: [],
      }),
    );
    getDisplayValuesMock.mockResolvedValue(
      ApiResult.success([
        {
          value: "728193",
          labels: { default: "Plovdiv", bg: "Пловдив" },
        },
      ]),
    );
    registerDataListGlobals();
  });

  it.each(["dropdown", "tagbox"] as const)(
    "passes StartsWith, locale es, and includeLocales from %s to the public search request",
    async (questionType) => {
      const model = new Model({
        pages: [
          {
            elements: [
              {
                type: questionType,
                name: "fruit",
                choicesLazyLoadEnabled: true,
              },
            ],
          },
        ],
      });
      model.locale = "es";
      vi.spyOn(model, "getUsedLocales").mockReturnValue(["es", "fr"]);

      const question = model.getQuestionByName(
        "fruit",
      ) as QuestionDropdownModel;
      question.setPropertyValue(DATA_LIST_PROPERTY_NAME, "42");
      question.searchMode = "startsWith";

      bindDataListsToSurvey(model, {
        deps: {
          getRuntimeState: () => ({ formId: "101" }),
        },
      });

      await new Promise<void>((resolve) => {
        model.onChoicesLazyLoad.fire(model, {
          question,
          filter: "Manz",
          skip: 0,
          take: 25,
          setItems: () => resolve(),
        });
      });

      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          formId: "101",
          dataListId: "42",
          query: "Manz",
          matchMode: "StartsWith",
          locale: "es",
          includeLocales: ["default", "es", "fr"],
          skip: 0,
          take: 25,
        }),
      );
    },
  );

  it("stamps full locale maps on selectedItemValues so locale switches stay labeled", async () => {
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
              defaultValue: ["728193"],
            },
          ],
        },
      ],
    });
    model.locale = "bg";
    vi.spyOn(model, "getUsedLocales").mockReturnValue(["bg", "en"]);

    const question = model.getQuestionByName("cities") as QuestionDropdownModel;
    question.setPropertyValue(DATA_LIST_PROPERTY_NAME, "42");

    bindDataListsToSurvey(model, {
      deps: {
        getRuntimeState: () => ({ formId: "101" }),
      },
    });

    await new Promise<void>((resolve) => {
      model.onGetChoiceDisplayValue.fire(model, {
        question,
        values: ["728193"],
        setItems: (items: string[]) => {
          // Mirror SurveyJS: create selected ItemValues from flat display strings.
          question.selectedItemValues = items.map((text, index) =>
            question.createItemValue(["728193"][index], text),
          );
          resolve();
        },
      });
    });

    expect(getDisplayValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        includeLocales: ["default", "bg"],
        values: ["728193"],
      }),
    );

    const selected = question.selectedItemValues as Array<{
      text: string;
      locText: { getJson: () => Record<string, string> };
    }>;
    expect(selected[0].locText.getJson()).toEqual({
      default: "Plovdiv",
      bg: "Пловдив",
    });
    expect(selected[0].text).toBe("Пловдив");

    model.locale = "";
    expect(selected[0].text).toBe("Plovdiv");

    model.locale = "bg";
    expect(selected[0].text).toBe("Пловдив");
  });
});
