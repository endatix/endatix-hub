import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { createTenantUserAction, type CreateTenantUserActionState } from "../create-tenant-user.action";
import { CreateTenantUserDialog } from "../ui/create-tenant-user-dialog";

vi.mock("../create-tenant-user.action", () => ({ createTenantUserAction: vi.fn() }));
const trackEvent = vi.hoisted(() => vi.fn());
const successToast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({ toast: { success: successToast, error: vi.fn() } }));
vi.mock("@/features/analytics/posthog/client", () => ({ useTrackEvent: () => ({ trackEvent }) }));

beforeEach(() => {
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: true, media, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});

function openInvite() {
  fireEvent.click(screen.getByRole("button", { name: "Invite User" }));
}

function sendInvite() {
  fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "member@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Send Invite" }));
}

it("keeps an invite eligibility refusal on the current draft", async () => {
  // Arrange
  vi.mocked(createTenantUserAction).mockResolvedValueOnce({ isSuccess: false, feedback: { kind: "declined" } });
  render(<CreateTenantUserDialog roles={[]} />);
  openInvite();
  // Act
  sendInvite();
  // Assert
  expect(await screen.findByText(/can’t invite teammates yet/)).toBeDefined();
  expect(screen.queryByRole("link", { name: "Continue workspace setup" })).toBeNull();
  expect((screen.getByLabelText("Email Address") as HTMLInputElement).value).toBe("member@example.com");
});

it("offers the owner an explicit setup link without resending the declined invite", async () => {
  vi.mocked(createTenantUserAction).mockResolvedValueOnce({ isSuccess: false, feedback: { kind: "setup" } });
  render(<CreateTenantUserDialog roles={[]} />);
  openInvite();
  sendInvite();
  const setup = await screen.findByRole("link", { name: "Continue workspace setup" });
  expect(setup.getAttribute("href")).toBe("/forms#workspace-setup");
  expect(createTenantUserAction).toHaveBeenCalledTimes(1);
});

it.each([true, false])("keeps a reopened draft intact after a late invite result (success: %s)", async (success) => {
  // Arrange
  let finish!: (state: CreateTenantUserActionState) => void;
  vi.mocked(createTenantUserAction).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  render(<CreateTenantUserDialog roles={[]} />);
  openInvite();
  sendInvite();
  // Act
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Invite User" }));
  fireEvent.change(screen.getByLabelText("Email Address"), { target: { value: "another@example.com" } });
  await act(async () => finish(success
    ? { isSuccess: true, message: "Invite sent." }
    : { isSuccess: false, feedback: { kind: "unavailable" } }));
  // Assert
  expect(screen.queryByText(/Invitations are temporarily unavailable/)).toBeNull();
  expect((screen.getByLabelText("Email Address") as HTMLInputElement).value).toBe("another@example.com");
  expect(trackEvent.mock.calls).toEqual(success ? [["organization_user_invited", { success: true }]] : []);
  expect(successToast.mock.calls).toEqual(success ? [["Invite sent"]] : []);
});
