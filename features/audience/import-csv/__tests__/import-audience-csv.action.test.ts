import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../../shared/with-hub-audience-api.server";
import { importAudienceCsvAction } from "../import-audience-csv.action";

vi.mock("../../shared/with-hub-audience-api.server", () => ({
  withHubAudienceApi: vi.fn(),
}));

const input = {
  formId: "1",
  csvText: "email\nada@example.com\n",
  identifierColumn: "email",
  fileName: "people.csv",
  propertyColumns: {},
};

describe("importAudienceCsvAction", () => {
  beforeEach(() => vi.mocked(withHubAudienceApi).mockReset());

  it("refuses a file over 5,000 rows before calling the API", async () => {
    const result = await importAudienceCsvAction({
      ...input,
      csvText: `email\n${"a@b.co\n".repeat(5_001)}`,
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toMatch(/5,001 rows/);
    expect(withHubAudienceApi).not.toHaveBeenCalled();
  });

  it("refuses a missing identifier before calling the API", async () => {
    const result = await importAudienceCsvAction({
      ...input,
      identifierColumn: "  ",
    });

    expect(Result.isError(result)).toBe(true);
    expect(withHubAudienceApi).not.toHaveBeenCalled();
  });
});
