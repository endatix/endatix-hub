import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { createAudiencePersonAction } from "../create-audience-person.action";
import { useAddPerson } from "../use-add-person.hook";

vi.mock("../create-audience-person.action", () => ({
  createAudiencePersonAction: vi.fn(),
}));
vi.mock("@/components/ui/toast", () => ({ toast: { success: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("useAddPerson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createAudiencePersonAction).mockResolvedValue(
      Result.success(undefined),
    );
  });

  it.each([
    [false, "Participant added"],
    [true, "Test participant added"],
  ])("with isTest %s, toasts %s", async (isTest, message) => {
    const { result } = renderHook(() => useAddPerson("1"));
    act(() => {
      result.current.setIdentifier("ana@example.com");
      result.current.setIsTest(isTest);
    });

    act(() => result.current.submit());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
    expect(createAudiencePersonAction).toHaveBeenCalledWith(
      expect.objectContaining({ formId: "1", isTest }),
    );
  });
});
