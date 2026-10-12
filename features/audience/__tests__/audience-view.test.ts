import { describe, expect, it } from "vitest";
import {
  AudienceView,
  audienceViewTabs,
  parseAudienceView,
} from "../get-audience-page/audience-view";

describe("parseAudienceView", () => {
  it.each([
    [undefined, AudienceView.People],
    ["people", AudienceView.People],
    ["unknown", AudienceView.People],
    ["properties", AudienceView.Properties],
  ])("reads %s as %s", (value, expected) => {
    // Act & Assert
    expect(parseAudienceView(value)).toBe(expected);
  });
});

describe("audienceViewTabs", () => {
  it("links People to the bare tab URL and carries both counts", () => {
    // Act
    const tabs = audienceViewTabs("f1", { people: 1240, properties: 3 });

    // Assert
    expect(tabs).toEqual([
      {
        id: "people",
        label: "People",
        href: "/forms/f1/audience",
        count: 1240,
      },
      {
        id: "properties",
        label: "Properties",
        href: "/forms/f1/audience?view=properties",
        count: 3,
      },
    ]);
  });
});
