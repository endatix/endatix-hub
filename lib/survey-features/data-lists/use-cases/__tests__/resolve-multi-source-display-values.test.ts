import { beforeEach, describe, expect, it, vi } from "vitest";
import { SurveyModel } from "survey-core";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { registerDataListGlobals } from "../../infrastructure/registry";
import { resolveMultiSourceDisplayValues } from "../resolve-multi-source-display-values";
import { resolveDataListDisplayValues } from "../resolve-data-list-display-values";

vi.mock("../resolve-data-list-display-values", () => ({
  resolveDataListDisplayValues: vi.fn(),
}));

const deps = {} as ExtensionRuntimeDeps;

describe("resolveMultiSourceDisplayValues", () => {
  beforeEach(() => {
    registerDataListGlobals();
    vi.mocked(resolveDataListDisplayValues).mockReset();
  });

  it("resolves static choices without calling data-list APIs", async () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "checkbox",
          name: "brands",
          choices: ["A", "B"],
        },
      ],
    });

    const labels = await resolveMultiSourceDisplayValues(
      deps,
      [survey.getQuestionByName("brands")!],
      ["A"],
    );

    expect(labels).toEqual(["brands: (A)"]);
    expect(resolveDataListDisplayValues).not.toHaveBeenCalled();
  });

  it("queries data-list sources in order until values are resolved", async () => {
    const survey = new SurveyModel({
      elements: [
        { type: "tagbox", name: "games", edxDataListId: "games-list" },
        { type: "tagbox", name: "brands", edxDataListId: "brands-list" },
      ],
    });

    vi.mocked(resolveDataListDisplayValues).mockImplementation(
      async (_deps, dataListId, values) => {
        if (dataListId === "games-list") {
          return ApiResult.success(new Map());
        }

        return ApiResult.success(
          new Map(
            values.map(
              (value) => [value, { default: `Label ${value}` }] as const,
            ),
          ),
        );
      },
    );

    const labels = await resolveMultiSourceDisplayValues(
      deps,
      [survey.getQuestionByName("games")!, survey.getQuestionByName("brands")!],
      ["brand-1"],
    );

    expect(labels).toEqual(["brands: (Label brand-1)"]);
    expect(resolveDataListDisplayValues).toHaveBeenCalledTimes(2);
  });

  it("continues resolving from later sources when an earlier source fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const survey = new SurveyModel({
      elements: [
        { type: "tagbox", name: "games", edxDataListId: "games-list" },
        { type: "tagbox", name: "brands", edxDataListId: "brands-list" },
      ],
    });

    vi.mocked(resolveDataListDisplayValues).mockImplementation(
      async (_deps, dataListId) => {
        if (dataListId === "games-list") {
          return ApiResult.authError("Unavailable");
        }

        return ApiResult.success(
          new Map([["brand-1", { default: "Brand One" }]]),
        );
      },
    );

    const labels = await resolveMultiSourceDisplayValues(
      deps,
      [survey.getQuestionByName("games")!, survey.getQuestionByName("brands")!],
      ["brand-1"],
    );

    expect(labels).toEqual(["brands: (Brand One)"]);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
