import { expect, it } from "vitest";
import { workspaceDestination } from "../terms-journey";

it("restores a workspace page with navigation state but no credentials", () => {
  expect(
    workspaceDestination("/forms/42/design?tab=preview&access_token=secret"),
  ).toBe("/forms/42/design?tab=preview");
});

it.each([
  undefined,
  "//outside.example",
  "/accept-terms",
  "/share/42",
  "/forms/../signin",
  "/api/forms",
  "/forms/%2e%2e/signout",
])("defaults an unsafe destination %s to forms", (value) => {
  expect(workspaceDestination(value)).toBe("/forms");
});

const files = "/forms/42/submissions/37/files";

it.each(["report (final).pdf", "résumé.pdf", "proof_1.txt"])(
  "retains a file table destination for %s",
  (name) => {
    const href = `${files}/${encodeURIComponent(name)}?tab=details`;
    expect(workspaceDestination(href)).toBe(href);
  },
);

it.each([
  `${files}/one/two`,
  `${files}/one%2Ftwo`,
  `${files}/one%5Ctwo`,
  `${files}/%2e%2e`,
  `${files}/one%252Ftwo`,
  `${files}/bad%`,
  "/forms/42/other/r%C3%A9sum%C3%A9.pdf",
  "/forms/x/submissions/37/files/report.pdf",
])("rejects an invalid file continuation %s", (href) => {
  expect(workspaceDestination(href)).toBe("/forms");
});
