import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { openTestSubmissionAction } from "../open-test-submission.action";
import { useTestAsPerson } from "../use-test-as-person.hook";

vi.mock("../open-test-submission.action", () => ({
  openTestSubmissionAction: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { error: vi.fn() } }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const PERSON = {
  membershipId: "9",
  identifier: "tester@example.com",
} as AudiencePerson;

function fakeTab() {
  return { close: vi.fn(), opener: {}, location: { href: "" } };
}

describe("useTestAsPerson", () => {
  beforeEach(() => vi.clearAllMocks());

  it("opens the tab on the click and points it at the respondent page", async () => {
    const tab = fakeTab();
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    vi.mocked(openTestSubmissionAction).mockResolvedValue(
      Result.success({ url: "/share/1" }),
    );

    await renderHook(() => useTestAsPerson("1")).result.current(PERSON);

    expect(openTestSubmissionAction).toHaveBeenCalledWith("1", "9");
    expect(tab.location.href).toBe("/share/1");
    expect(tab.opener).toBeNull();
  });

  it("refreshes the page once the test submission is open, so it lists the new submission", async () => {
    vi.spyOn(window, "open").mockReturnValue(fakeTab() as unknown as Window);
    vi.mocked(openTestSubmissionAction).mockResolvedValue(
      Result.success({ url: "/share/1" }),
    );

    await renderHook(() => useTestAsPerson("1")).result.current(PERSON);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("closes the tab and toasts when the action fails", async () => {
    const tab = fakeTab();
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    vi.mocked(openTestSubmissionAction).mockResolvedValue(
      Result.error("The person is not on this form."),
    );

    await renderHook(() => useTestAsPerson("1")).result.current(PERSON);

    expect(tab.close).toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("The person is not on this form.");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("says so when the browser blocks the tab, without opening a submission", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    await renderHook(() => useTestAsPerson("1")).result.current(PERSON);

    expect(open).toHaveBeenCalledTimes(1);
    expect(openTestSubmissionAction).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/pop-ups/));
  });

  it("ignores a second click while the first is opening", async () => {
    const tab = fakeTab();
    const open = vi
      .spyOn(window, "open")
      .mockReturnValue(tab as unknown as Window);
    vi.mocked(openTestSubmissionAction).mockResolvedValue(
      Result.success({ url: "/share/1" }),
    );
    const testAs = renderHook(() => useTestAsPerson("1")).result.current;

    await Promise.all([testAs(PERSON), testAs(PERSON)]);

    expect(open).toHaveBeenCalledTimes(1);
    expect(openTestSubmissionAction).toHaveBeenCalledTimes(1);
  });
});
