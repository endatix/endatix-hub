import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Model } from "survey-core";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { clearChoicesLazyLoadGuardsForTests } from "@/lib/survey-features/infrastructure/choices-lazy-load-guards";
import { registerAdvancedCarryForwardGlobals } from "@/lib/survey-features/carry-forward/infrastructure/registry";
import {
  bindAdvancedCarryForwardToSurvey,
  clearAdvancedCarryForwardBindingsForTests,
} from "@/lib/survey-features/carry-forward/infrastructure/survey-bindings";
import { resetCarryForwardUpdateGuardForTests } from "@/lib/survey-features/carry-forward/infrastructure/carry-forward-sync";
import type { AdvancedCarryForwardQuestion } from "@/lib/survey-features/carry-forward/types";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { clearDataListDisplayValuesCacheForTests } from "../../use-cases/resolve-data-list-display-values";
import { registerDataListGlobals } from "../registry";
import { bindDataListsToSurvey } from "../survey-bindings";

const { getDisplayValuesMock } = vi.hoisted(() => ({
  getDisplayValuesMock: vi.fn(),
}));

vi.mock("@/lib/endatix-api/public", () => ({
  createEndatixPublicApi: () => ({
    dataLists: {
      search: vi.fn(),
      getDisplayValues: getDisplayValuesMock,
    },
  }),
}));

vi.mock("@/lib/form-runtime/form-access-jwt-orchestrator", () => ({
  ensureRuntimeFormAccessJwt: vi.fn().mockResolvedValue("test-form-access-jwt"),
  invalidateRuntimeFormAccessJwt: vi.fn(),
}));

type SelectedChoiceItem = {
  text: string;
  value?: unknown;
  locText: { getJson: () => Record<string, string> };
};

type LazyTagbox = {
  value: unknown;
  selectedItemValues: SelectedChoiceItem[];
  createItemValue: (value: string, text?: string) => SelectedChoiceItem;
  setPropertyValue: (name: string, value: unknown) => void;
};

describe("lazy-load display values → carry-forward", () => {
  beforeAll(() => {
    registerAdvancedCarryForwardGlobals();
    registerDataListGlobals();
  });

  beforeEach(() => {
    clearChoicesLazyLoadGuardsForTests();
    clearDataListDisplayValuesCacheForTests();
    clearAdvancedCarryForwardBindingsForTests();
    resetCarryForwardUpdateGuardForTests();
    getDisplayValuesMock.mockReset();
    getDisplayValuesMock.mockImplementation(
      async (request: { values: string[] }) => {
        const catalog: Record<string, Record<string, string>> = {
          "2510911": { default: "Sevilla", es: "Sevilla" },
          "3117735": { default: "A Coruña", es: "A Coruña" },
          "2520493": {
            default: "'s-Hertogenbosch",
            es: "'s-Hertogenbosch",
          },
        };
        return ApiResult.success(
          request.values.map((value) => ({
            value,
            labels: catalog[value] ?? { default: value },
          })),
        );
      },
    );
  });

  it("re-syncs carry-forward with labels after a partial display-value race", async () => {
    const model = new Model({
      locale: "es",
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "cities",
              choicesLazyLoadEnabled: true,
              choices: [],
            },
            {
              type: "checkbox",
              name: "target",
              choices: ["legacy"],
              edxCarryForwardEnabled: true,
              edxCarryForwardSources: ["cities"],
              edxCarryForwardMode: "selected",
            },
          ],
        },
      ],
    });
    model.locale = "es";

    const cities = model.getQuestionByName("cities") as unknown as LazyTagbox;
    cities.setPropertyValue(DATA_LIST_PROPERTY_NAME, "42");
    cities.value = ["2510911", "3117735", "2520493"];

    bindDataListsToSurvey(model, {
      deps: { getRuntimeState: () => ({ formId: "101" }) },
    });
    bindAdvancedCarryForwardToSurvey(model);

    const target = model.getQuestionByName(
      "target",
    ) as AdvancedCarryForwardQuestion;

    // First sync (value already set) may only see IDs — expected before labels.
    expect(target.choices.map((item) => item.value)).toEqual([
      "2510911",
      "3117735",
      "2520493",
    ]);

    await new Promise<void>((resolve) => {
      void model.onGetChoiceDisplayValue.fire(model, {
        question: cities as never,
        // SurveyJS in-flight snapshot only had the first selected value.
        values: ["2510911"],
        setItems: (items: string[]) => {
          cities.selectedItemValues = items.map((text, index) =>
            cities.createItemValue(["2510911"][index]!, text),
          );
          resolve();
        },
      });
    });

    await vi.waitFor(() => {
      expect(
        target.choices.map((item) => ({ value: item.value, text: item.text })),
      ).toEqual([
        { value: "2510911", text: "Sevilla" },
        { value: "3117735", text: "A Coruña" },
        { value: "2520493", text: "'s-Hertogenbosch" },
      ]);
    });
  });
});
