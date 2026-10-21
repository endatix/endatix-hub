import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorization,
  AuthorizationResult,
  Permissions,
} from "@/features/auth/authorization";
import { personalizationFlag } from "@/lib/feature-flags";
import { viewerCanOpenParticipantUseCase } from "../viewer-can-open-participant.use-case";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({ personalizationFlag: vi.fn() }));
vi.mock("@/features/auth/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/authorization")>()),
  authorization: vi.fn(),
}));

const checkPermission = vi.fn();

function viewer({ canEdit, flag }: { canEdit: boolean; flag: boolean }) {
  vi.mocked(personalizationFlag).mockResolvedValue(flag);
  checkPermission.mockImplementation(async (permission: string) =>
    canEdit && permission === Permissions.Forms.Edit
      ? AuthorizationResult.success()
      : AuthorizationResult.forbidden(),
  );
}

describe("viewerCanOpenParticipantUseCase", () => {
  beforeEach(() => {
    vi.mocked(authorization).mockResolvedValue({
      checkPermission,
    } as unknown as Awaited<ReturnType<typeof authorization>>);
  });

  it("lets an editor open the participant page while personalization is on", async () => {
    viewer({ canEdit: true, flag: true });
    expect(await viewerCanOpenParticipantUseCase()).toBe(true);
  });

  it("refuses a viewer without forms.edit", async () => {
    viewer({ canEdit: false, flag: true });
    expect(await viewerCanOpenParticipantUseCase()).toBe(false);
  });

  it("refuses everyone while personalization is off, since the page redirects", async () => {
    viewer({ canEdit: true, flag: false });
    expect(await viewerCanOpenParticipantUseCase()).toBe(false);
  });
});
