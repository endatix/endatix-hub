import { beforeEach, describe, expect, it, vi } from "vitest";
import { Model, QuestionDropdownModel } from "survey-core";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { clearChoicesLazyLoadGuardsForTests } from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { registerDataListGlobals } from "../registry";
import { bindDataListsToSurvey } from "../survey-bindings";

const { searchMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: () => ({
    dataLists: {
      search: searchMock,
    },
  }),
}));

vi.mock("@/lib/form-runtime/form-access-jwt-orchestrator", () => ({
  ensureRuntimeFormAccessJwt: vi.fn().mockResolvedValue("test-form-access-jwt"),
  invalidateRuntimeFormAccessJwt: vi.fn(),
}));

describe("bindDataListsToSurvey onChoicesLazyLoad", () => {
  beforeEach(() => {
    clearChoicesLazyLoadGuardsForTests();
    searchMock.mockReset();
    searchMock.mockResolvedValue(
      ApiResult.success({
        page: 1,
        pageSize: 25,
        totalRecords: 0,
        totalPages: 0,
        items: [],
      }),
    );
    registerDataListGlobals();
  });

  it.each(["dropdown", "tagbox"] as const)(
    "passes StartsWith and locale es from %s to the public search request",
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

      const question = model.getQuestionByName("fruit") as QuestionDropdownModel;
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
          skip: 0,
          take: 25,
        }),
      );
    },
  );
});
