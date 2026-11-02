import { describe, expect, it } from "vitest";
import { redirect } from "next/navigation";
import { Result } from "@/lib/result";
import { toActionFailure } from "@/lib/result/action-failure";

describe("toActionFailure", () => {
  it("turns a thrown error into an error result with the given message", () => {
    const result = toActionFailure<string>("Failed to delete form template")(
      new Error("fetch failed"),
    );

    expect(Result.isError(result)).toBe(true);
    expect(Result.isError(result) && result.message).toBe(
      "Failed to delete form template",
    );
  });

  it("rethrows a Next redirect so navigation still happens", () => {
    let redirectError: unknown;
    try {
      redirect("/login");
    } catch (error) {
      redirectError = error;
    }

    expect(() => toActionFailure("Failed")(redirectError)).toThrow(
      redirectError as Error,
    );
  });
});
