import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { PendingActionStatus } from "../pending-action-status";

const pending = {
  key: "profile.complete",
  scope: "tenant",
  resolverRoles: ["Admin"],
  resolvePath: "/profile",
  severity: "blocking",
  blockNonResolvers: true,
  canResolve: false,
} as const;

it("tells a non-resolver who can act without offering the resolver link", () => {
  // Act
  render(
    <PendingActionStatus
      actions={[{ ...pending, resolverRoles: ["Admin"] }]}
    />,
  );

  // Assert
  expect(screen.getByText(/your organization’s admin must/i)).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Review action" })).toBeNull();
});
