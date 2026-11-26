import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { showActionFailure } from "../show-action-failure";
import { toast } from "@/components/ui/toast";

vi.mock("@/components/ui/toast", () => ({
  toast: { warning: vi.fn(), error: vi.fn() },
}));

it("offers account status instead of bouncing a refused save on its own resolver", () => {
  // Arrange
  history.replaceState(null, "", "/settings/organization/forms");
  vi.mocked(toast.warning).mockImplementation((options) => {
    if (typeof options === "object" && "description" in options)
      render(options.description as ReactElement);
    return 1;
  });

  // Act
  showActionFailure({
    message: "Forbidden",
    requiredAction: {
      kind: "required_action",
      actions: [
        {
          key: "profile",
          scope: "tenant",
          severity: "blocking",
          resolverRoles: [],
          resolvePath: "/settings/organization",
          canResolve: true,
          blockNonResolvers: true,
        },
      ],
    },
  });

  // Assert
  expect(
    screen
      .getByRole("link", { name: "View account status" })
      .getAttribute("href"),
  ).toBe("/required-actions");
});
