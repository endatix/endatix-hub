import { describe, expect, it, vi } from "vitest";
import {
  buildReservedDataListNames,
  collectReservedDataListNames,
} from "../collect-reserved-data-list-names";
import { getQuestionDataListName } from "@/lib/survey-features/data-lists/utils";

describe("collectReservedDataListNames", () => {
  it("reserves picker matches so bulk conversion does not reuse existing names", async () => {
    const searchNames = vi.fn().mockResolvedValue(["Countries"]);
    const candidates = [{ title: "Countries", name: "q1", type: "dropdown" }];

    const reserved = await collectReservedDataListNames({
      knownNames: [],
      candidates,
      searchNames,
    });

    expect(searchNames).toHaveBeenCalledWith("Countries");
    expect(reserved.has("countries")).toBe(true);
    expect(
      getQuestionDataListName(
        { title: "Countries", name: "q1", type: "dropdown" },
        reserved,
      ),
    ).toBe("Countries (2)");
  });

  it("keeps known names from diagnostics context", () => {
    expect(buildReservedDataListNames(["Regions"])).toEqual(
      new Set(["regions"]),
    );
  });
});
