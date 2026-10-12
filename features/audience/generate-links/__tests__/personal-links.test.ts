import { describe, expect, it } from "vitest";
import { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { readCsvRecords } from "@/lib/utils/csv";
import { linksCsv, linksFileName } from "../personal-links";

describe("personal links file", () => {
  it("writes one row per person under the match key's name", () => {
    // Arrange
    const links = [
      { identifier: "CG-000001-01", token: "abc" },
      { identifier: "", token: "def" },
    ];

    // Act
    const csv = linksCsv({
      origin: "https://hub.test",
      formId: "42",
      identifierKind: AudienceIdentifierKind.ExternalId,
      links,
    });

    // Assert
    expect(readCsvRecords(csv)).toEqual([
      ["external_id", "link"],
      ["CG-000001-01", "https://hub.test/share/42/a/abc"],
      ["", "https://hub.test/share/42/a/def"],
    ]);
  });

  it("dates the file name so a second batch never overwrites the first", () => {
    expect(linksFileName("42", new Date("2026-10-12T09:30:00Z"))).toBe(
      "personalised-links-42-2026-10-12.csv",
    );
  });
});
