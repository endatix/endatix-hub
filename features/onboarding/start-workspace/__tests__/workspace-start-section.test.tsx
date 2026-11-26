import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { WorkspaceStartSection } from "../workspace-start-section";
import { canResumeWorkspaceSetup } from "../workspace-api.server";
import { retryPreparation, startBlank } from "../start-blank.action";
import { readPreparation } from "../preparation-status.action";

const { get, post, grant, enabled, onboarding, revalidate } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  grant: vi.fn(),
  enabled: vi.fn(),
  onboarding: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "current" }) }));
vi.mock("@/features/auth/authorization", async (original) => ({
  ...(await original<object>()),
  authorization: async () => ({ checkAllPermissions: grant }),
}));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class {
    get = get;
    post = post;
  },
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  saasManagementFlag: enabled,
  onboardingFlag: onboarding,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));

beforeEach(() => {
  enabled.mockResolvedValue(true);
  onboarding.mockResolvedValue(true);
  grant.mockResolvedValue({ success: true });
  get.mockResolvedValue(ApiResult.success({ state: "offered", choices: ["blank"], formId: null }));
});

it.each([
  ["offered", true], ["working", true], ["retryable", true], ["ready", false],
] as const)("offers navigation for incomplete saved setup (%s)", async (state, expected) => {
  onboarding.mockResolvedValue(false);
  get.mockResolvedValueOnce(ApiResult.success({ state, choices: ["blank"], formId: null }));
  expect(await canResumeWorkspaceSetup()).toBe(expected);
  expect(post).not.toHaveBeenCalled();
});

it("hides setup navigation without a readable owner receipt", async () => {
  grant.mockResolvedValueOnce({ success: false });
  expect(await canResumeWorkspaceSetup()).toBe(false);
  expect(get).not.toHaveBeenCalled();
  get.mockResolvedValueOnce(ApiResult.notFoundError("missing", { statusCode: 404 }));
  expect(await canResumeWorkspaceSetup()).toBe(false);
});

it.each(["themes.create", "themes.view"])("keeps finish blank available without %s", async (missing) => {
  // Arrange
  onboarding.mockResolvedValue(false);
  grant.mockImplementation((permissions: string[]) => ({ success: !permissions.includes(missing) }));
  get.mockResolvedValueOnce(ApiResult.success({ state: "retryable", choices: [], formId: null }));
  // Act
  render(await WorkspaceStartSection());
  // Assert
  expect(screen.getByRole("button", { name: "Finish blank" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Retry preparation", hidden: true })).toBeNull();
  expect(await retryPreparation(workspaceScope("current")!)).toMatchObject({ message: expect.stringContaining("not available") });
  expect(post).not.toHaveBeenCalled();
});

it("retries the saved choice only in the displayed workspace", async () => {
  // Act & Assert
  await retryPreparation("old workspace");
  expect(post).not.toHaveBeenCalled();
  post.mockResolvedValueOnce(ApiResult.success({ state: "working", choices: [], formId: null }));
  const result = await retryPreparation(workspaceScope("current")!);
  expect(post.mock.calls).toEqual([["/onboarding/workspace-start/retry"]]);
  expect(result).toMatchObject({ value: { kind: "working" } });
  expect(revalidate).toHaveBeenCalledWith("/forms");
});

it("reads the displayed workspace and preserves a busy status separately from completion", async () => {
  // Arrange
  const scope = workspaceScope("current")!;
  get.mockResolvedValueOnce(ApiResult.httpStatusError(503, "Busy"));
  get.mockResolvedValueOnce(ApiResult.success({ state: "ready", choices: [], formId: "42" }));
  // Act & Assert
  expect(await readPreparation("another session")).toMatchObject({ statusCode: 403 });
  expect(get).not.toHaveBeenCalled();
  expect(await readPreparation(scope)).toMatchObject({ statusCode: 503 });
  expect(await readPreparation(scope)).toMatchObject({ value: { kind: "complete", formId: "42" } });
});

it("leaves a non-enrolled member in their normal workspace", async () => {
  // Arrange
  get.mockResolvedValueOnce(ApiResult.notFoundError("missing", { statusCode: 404 }));
  // Act & Assert
  const { container } = render(await WorkspaceStartSection());
  expect(container.textContent).toBe("");
  expect(post).not.toHaveBeenCalled();
});

it.each(["forms.create", "forms.edit", "forms.view", "access.apps.hub"])(
  "never reads or creates a starter without %s",
  async (missing) => {
    // Arrange
    grant.mockImplementation((permissions: string[]) => ({ success: !permissions.includes(missing) }));
    // Act
    expect(await WorkspaceStartSection()).toBeNull();
    const result = await startBlank(workspaceScope("current")!);
    // Assert
    expect(result).toMatchObject({ message: expect.stringContaining("not available") });
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  },
);

it("keeps the enrolled owner's blank choice reachable after rollout is paused", async () => {
  // Arrange
  onboarding.mockResolvedValue(false);
  // Act
  render(await WorkspaceStartSection());
  // Assert
  expect(screen.getByRole("button", { name: "Start blank" })).toBeTruthy();
  expect(post).not.toHaveBeenCalled();
});

it("leaves ordinary hosts and callers without editor grants out of setup", async () => {
  // Arrange
  enabled.mockResolvedValueOnce(false);
  grant.mockResolvedValueOnce({ success: false });
  // Act & Assert
  expect(await WorkspaceStartSection()).toBeNull();
  expect(await WorkspaceStartSection()).toBeNull();
  expect(get).not.toHaveBeenCalled();
});

it("does not create a survey from another session's displayed offer", async () => {
  // Act
  const result = await startBlank("old workspace");
  // Assert
  expect(result).toMatchObject({ message: expect.stringContaining("Refresh") });
  expect(post).not.toHaveBeenCalled();
});

it("sends the explicit choice to the owner endpoint and refreshes Forms after confirmation", async () => {
  // Arrange
  post.mockResolvedValueOnce(ApiResult.success({ state: "blank", choices: [], formId: "42" }));
  // Act
  const result = await startBlank(workspaceScope("current")!);
  // Assert
  expect(post).toHaveBeenCalledWith("/onboarding/workspace-start/blank");
  expect(result).toMatchObject({ value: { kind: "complete", formId: "42" } });
  expect(revalidate).toHaveBeenCalledWith("/forms");
});

it("leaves Forms unchanged when blank setup is busy and refreshes only after a confirmed retry", async () => {
  // Arrange
  const scope = workspaceScope("current")!;
  post.mockResolvedValueOnce(ApiResult.httpStatusError(503, "Workspace setup is busy. Try again."));
  post.mockResolvedValueOnce(ApiResult.success({ state: "blank", choices: [], formId: "42" }));

  // Act & Assert
  const busy = await startBlank(scope);
  expect(busy).toMatchObject({ statusCode: 503, message: "Workspace setup is busy. Try again." });
  expect(revalidate).not.toHaveBeenCalled();
  const resumed = await startBlank(scope);
  expect(resumed).toMatchObject({ value: { kind: "complete", formId: "42" } });
  expect(revalidate.mock.calls).toEqual([["/forms"], ["/workspace/setup"]]);
});

it("offers recovery on the dedicated page when the receipt cannot be read", async () => {
  get.mockRejectedValueOnce(new Error("Receipt unavailable"));
  const section = await WorkspaceStartSection();
  expect(section).not.toBeNull();
  expect(post).not.toHaveBeenCalled();
});
