import { describe, expect, it } from "vitest";
import { buildListFormsEndpoint } from "../forms";

describe("buildListFormsEndpoint", () => {
  it("sends valid calendar date bounds", () => {
    const endpoint = buildListFormsEndpoint({
      createdFrom: "2024-01-01",
      createdTo: "2024-01-31",
      modifiedFrom: "2024-02-01",
      modifiedTo: "2024-02-28",
    });

    expect(endpoint).toContain("createdFrom=2024-01-01");
    expect(endpoint).toContain("createdTo=2024-01-31");
    expect(endpoint).toContain("modifiedFrom=2024-02-01");
    expect(endpoint).toContain("modifiedTo=2024-02-28");
  });

  it("drops invalid calendar dates while keeping valid ones", () => {
    const endpoint = buildListFormsEndpoint({
      createdFrom: "not-a-date",
      createdTo: "2024-01-31",
      modifiedFrom: "2024-02-01",
      modifiedTo: "2024-13-40",
    });

    expect(endpoint).not.toContain("createdFrom=");
    expect(endpoint).toContain("createdTo=2024-01-31");
    expect(endpoint).toContain("modifiedFrom=2024-02-01");
    expect(endpoint).not.toContain("modifiedTo=");
  });
});
