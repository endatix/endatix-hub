import { beforeEach, describe, expect, it, vi } from "vitest";
import { Permissions } from "@/features/auth/authorization";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { mintTestLinks as mintRoute } from "@/lib/endatix-api/audience/test-links";
import { Result } from "@/lib/result";
import { requireAudienceAccess } from "../../shared/require-audience-api.server";
import { grantedChecks } from "../../shared/__tests__/support/granted-checks";
import { downloadTestLinksAction } from "../download-test-links.action";

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn() },
}));
vi.mock("@/lib/endatix-api/audience/test-links", () => ({
  mintTestLinks: vi.fn(),
}));
vi.mock("../../shared/require-audience-api.server", () => ({
  requireAudienceAccess: vi.fn(),
}));

const FORM_ID = "1525035735390879744";
const MEMBERSHIP_ID = "1526934587983265792";
const SEVEN_DAYS = 60 * 24 * 7;

const mintTestLinks = vi.mocked(mintRoute);
const api = {};

const { checks, grant } = grantedChecks();

describe("downloadTestLinksAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAudienceAccess).mockResolvedValue(
      Result.success({ api, ...checks } as never),
    );
    grant(Permissions.Forms.Test, Permissions.Forms.Edit);
    mintTestLinks.mockResolvedValue(
      ApiResult.success([
        {
          membershipId: MEMBERSHIP_ID,
          identifier: "tester@acme.test",
          run: 1,
          submissionId: "7",
          token: "t1",
          expiresAt: "2026-11-06T10:00:00Z",
        },
      ]),
    );
  });

  it("asks for every test participant and returns each run's identifier and token", async () => {
    const result = await downloadTestLinksAction(FORM_ID, {
      membershipIds: null,
      runsEach: 3,
      expiryMinutes: SEVEN_DAYS,
    });

    expect(mintTestLinks).toHaveBeenCalledWith(api, FORM_ID, {
      membershipIds: null,
      runsEach: 3,
      expiryMinutes: SEVEN_DAYS,
    });
    expect(result).toEqual(
      Result.success([
        {
          identifier: "tester@acme.test",
          run: 1,
          token: "t1",
          expiresAt: "2026-11-06T10:00:00Z",
        },
      ]),
    );
  });

  it("sends the selected participants only", async () => {
    await downloadTestLinksAction(FORM_ID, {
      membershipIds: [MEMBERSHIP_ID],
      runsEach: 1,
      expiryMinutes: SEVEN_DAYS,
    });

    expect(mintTestLinks).toHaveBeenCalledWith(
      api,
      FORM_ID,
      expect.objectContaining({ membershipIds: [MEMBERSHIP_ID] }),
    );
  });

  it.each([
    [0, 1],
    [11, 10],
    [Number.NaN, 1],
  ])("keeps %s runs within 1 to 10 (%s)", async (asked, sent) => {
    await downloadTestLinksAction(FORM_ID, {
      membershipIds: null,
      runsEach: asked,
      expiryMinutes: 1,
    });

    expect(mintTestLinks).toHaveBeenCalledWith(api, FORM_ID, {
      membershipIds: null,
      runsEach: sent,
      expiryMinutes: 60,
    });
  });

  it("returns the API's refusal", async () => {
    mintTestLinks.mockResolvedValue(
      ApiResult.validationError(
        "600 test submissions were asked for; the limit is 500 per call.",
      ),
    );

    const result = await downloadTestLinksAction(FORM_ID, {
      membershipIds: null,
      runsEach: 10,
      expiryMinutes: SEVEN_DAYS,
    });

    expect(Result.isError(result) && result.message).toMatch(/limit is 500/);
  });

  it("refuses a reader who cannot edit forms, before asking", async () => {
    grant(Permissions.Forms.Test);

    const result = await downloadTestLinksAction(FORM_ID, {
      membershipIds: null,
      runsEach: 1,
      expiryMinutes: SEVEN_DAYS,
    });

    expect(Result.isError(result)).toBe(true);
    expect(mintTestLinks).not.toHaveBeenCalled();
    expect(requireAudienceAccess).toHaveBeenCalledWith(Permissions.Forms.Test);
  });
});
