import { expect, it } from "vitest";
import { resolveTarget } from "../resolve-target";

const pending = {
  key: "profile.complete",
  resolvePath: "/profile",
  severity: "blocking",
  canResolve: true,
} as const;

it("sends the return-home blocker to status even on a co-reported personal resolver", () => {
  const home = {
    ...pending,
    key: "saas.legal.return-home",
    canResolve: false,
    resolvePath: "/required-actions",
  };
  expect(resolveTarget([pending, home], "/profile")).toBe("/required-actions");
});

it("does not bounce from a resolver back through its settings alias", () => {
  expect(
    resolveTarget(
      [{ ...pending, resolvePath: "/settings/organization" }],
      "/settings/organization/forms",
    ),
  ).toBeNull();
});

it("opens the provider page for a resolver and the help page for a non-resolver", () => {
  expect(resolveTarget([pending], "/forms")).toBe("/profile");
  expect(resolveTarget([{ ...pending, canResolve: false }], "/forms")).toBe(
    "/required-actions",
  );
});

it.each([
  "/profile",
  "/profile/",
  "/signin",
  "/t/example/signin",
  "/required-actions",
])("does not redirect from %s", (path) => {
  expect(resolveTarget([pending], path)).toBeNull();
});

it.each([
  "https://example.org",
  "//example.org",
  "/api/auth",
  "/a/../signin",
  "/%2fexample.org",
  "/\\example.org",
])("falls back to help for %s", (resolvePath) => {
  expect(resolveTarget([{ ...pending, resolvePath }], "/forms")).toBe(
    "/required-actions",
  );
});

it("lets a user continue past notices", () => {
  expect(
    resolveTarget([{ ...pending, severity: "notice" }], "/forms"),
  ).toBeNull();
});
