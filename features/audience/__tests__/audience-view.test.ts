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
  it("links Participants to the bare tab URL and carries both counts", () => {
    // Act
    const tabs = audienceViewTabs("f1", { people: 1240, properties: 3 });

    // Assert
    expect(tabs).toEqual([
      {
        id: "people",
        label: "Participants",
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

  it("adds Preview as for a reader who may edit the form", () => {
    // Act
    const tabs = audienceViewTabs(
      "f1",
      { people: 2, properties: 3 },
      { previewAs: true },
    );

    // Assert
    expect(tabs.at(-1)).toEqual({
      id: "preview-as",
      label: "Preview as",
      href: "/forms/f1/audience/preview-as",
    });
  });

  it("leaves Preview as out on a form with no Properties", () => {
    // Act
    const tabs = audienceViewTabs(
      "f1",
      { people: 2, properties: 0 },
      { previewAs: true },
    );

    // Assert
    expect(tabs.map((tab) => tab.id)).toEqual(["people", "properties"]);
  });
});
