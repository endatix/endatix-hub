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
