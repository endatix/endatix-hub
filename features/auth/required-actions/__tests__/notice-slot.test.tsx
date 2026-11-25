import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { NoticeSlot } from "../notice-slot";

const { readSnapshot } = vi.hoisted(() => ({ readSnapshot: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => ({}) }));
vi.mock("../../authorization/application/authorization-data.provider", () => ({
  getAuthDataForCurrentUser: () => readSnapshot,
}));

const pending = {
  key: "profile.complete",
  resolvePath: "/profile",
  scope: "user",
  severity: "blocking",
  canResolve: true,
  resolverRoles: [],
  blockNonResolvers: false,
};

it.each([{}, { requiredActions: [] }, { requiredActions: [pending] }])(
  "leaves ordinary content available for a snapshot without evidence of enforcement (%o)",
  async (data) => {
    // Arrange
    readSnapshot.mockResolvedValue({ success: true, data });

    // Act
    render(
      <>
        {await NoticeSlot()}
        <button>Open form</button>
      </>,
    );

    // Assert
    expect(screen.getByRole("button", { name: "Open form" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  },
);

it("shows a projected non-resolver notice without a resolution link", async () => {
  // Arrange
  readSnapshot.mockResolvedValue({
    success: true,
    data: {
      requiredActions: [{ ...pending, severity: "notice", canResolve: false }],
    },
  });

  // Act
  render(await NoticeSlot());

  // Assert
  expect(screen.getByRole("status").textContent).toContain("continue working");
  expect(screen.queryByRole("link")).toBeNull();
});
