import { describe, expect, it } from "vitest";
import { testLinksCsv, testLinksFileName } from "../test-links-file";

describe("test links file", () => {
  it("is named for the form and the day", () => {
    expect(testLinksFileName("42", new Date("2026-10-30T12:00:00Z"))).toBe(
      "test-links-42-2026-10-30.csv",
    );
  });

  it("has one row per run: identifier, run, and the absolute share link", () => {
    const csv = testLinksCsv({
      origin: "https://hub.acme.test",
      formId: "42",
      links: [
        { identifier: "tester@acme.test", run: 1, token: "a.b", expiresAt: "" },
        { identifier: "tester@acme.test", run: 2, token: "c d", expiresAt: "" },
      ],
    });

    expect(csv.trim().split(/\r?\n/)).toEqual([
      "identifier,run,link",
      "tester@acme.test,1,https://hub.acme.test/share/42?token=a.b",
      "tester@acme.test,2,https://hub.acme.test/share/42?token=c+d",
    ]);
  });
});
