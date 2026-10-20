import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";
import { loadFilterableQuestions } from "../load-filterable-questions.server";
import { FilterableQuestionsSection } from "../ui/filterable-questions-section";

vi.mock("../load-filterable-questions.server", () => ({
  loadFilterableQuestions: vi.fn(),
}));

describe("FilterableQuestionsSection", () => {
  it("says quietly that the list could not be read, without the API's words", async () => {
    // Arrange
    vi.mocked(loadFilterableQuestions).mockResolvedValue({
      kind: "error",
      result: Result.error("Upstream exploded", undefined, undefined, {
        statusCode: 500,
        traceId: "trace-1",
      }),
    });

    // Act
    render(await FilterableQuestionsSection({ formId: "5" }));

    // Assert
    const line = screen.getByText(/could not be loaded/i);
    expect(line.className).toContain("text-muted-foreground");
    expect(line.className).not.toContain("text-destructive");
    expect(screen.queryByText("Upstream exploded")).toBeNull();
  });
});
