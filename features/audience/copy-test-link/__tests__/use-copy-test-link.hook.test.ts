import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { createTestLinkAction } from "../create-test-link.action";
import { useCopyTestLink } from "../use-copy-test-link.hook";

vi.mock("../create-test-link.action", () => ({
  createTestLinkAction: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const SEVEN_DAYS = 60 * 24 * 7;
const ONE_HOUR = 60;
const LINK = {
  url: "/share/1?token=signed.token",
  expiresAt: "2026-11-02T10:00:00Z",
};

const PERSON = { audienceMemberId: "9", membershipId: "12" };

const writeText = vi.fn();

describe("useCopyTestLink", () => {
  const onCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    vi.mocked(createTestLinkAction).mockResolvedValue(Result.success(LINK));
  });

  it("asks for a 7-day link unless another lifetime is chosen", async () => {
    const { result } = renderHook(() => useCopyTestLink("1", PERSON));

    expect(result.current.expiryMinutes).toBe(SEVEN_DAYS);
    await act(() => result.current.copy());
    expect(createTestLinkAction).toHaveBeenLastCalledWith(
      "1",
      PERSON,
      SEVEN_DAYS,
    );

    act(() => result.current.setExpiryMinutes(ONE_HOUR));
    await act(() => result.current.copy());
    expect(createTestLinkAction).toHaveBeenLastCalledWith(
      "1",
      PERSON,
      ONE_HOUR,
    );
  });

  it("copies the absolute link, keeps it to show, and says it opens one test submission", async () => {
    const { result } = renderHook(() =>
      useCopyTestLink("1", PERSON, onCreated),
    );

    await act(() => result.current.copy());

    const url = `${window.location.origin}${LINK.url}`;
    expect(writeText).toHaveBeenCalledWith(url);
    expect(result.current.link).toEqual({ url, expiresAt: LINK.expiresAt });
    expect(toast.success).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test link copied",
        description: expect.stringMatching(/one test submission/),
      }),
    );
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("still shows the link when the browser refuses the clipboard", async () => {
    writeText.mockRejectedValue(new Error("Document is not focused."));
    const { result } = renderHook(() => useCopyTestLink("1", PERSON));

    await act(() => result.current.copy());

    expect(result.current.link?.url).toBe(
      `${window.location.origin}${LINK.url}`,
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Test link created" }),
    );
  });

  it("toasts the failure and copies nothing", async () => {
    vi.mocked(createTestLinkAction).mockResolvedValue(
      Result.error("Test links are only for test participants."),
    );
    const { result } = renderHook(() =>
      useCopyTestLink("1", PERSON, onCreated),
    );

    await act(() => result.current.copy());

    expect(toast.error).toHaveBeenCalledWith(
      "Test links are only for test participants.",
    );
    expect(writeText).not.toHaveBeenCalled();
    expect(result.current.link).toBeNull();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("creates one link for a double click", async () => {
    const { result } = renderHook(() => useCopyTestLink("1", PERSON));

    await act(() =>
      Promise.all([result.current.copy(), result.current.copy()]),
    );

    expect(createTestLinkAction).toHaveBeenCalledTimes(1);
  });
});
