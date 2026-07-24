import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { deleteSuccessToastContent } from "../ui/delete-success-toast-content";

describe("deleteSuccessToastContent", () => {
  it("emphasizes Test for test submissions", () => {
    const content = deleteSuccessToastContent("test");
    render(
      <div>
        <div>{content.title}</div>
        <div>{content.description}</div>
      </div>,
    );

    expect(screen.getByText("Test")).toBeDefined();
    expect(screen.getByText(/submission deleted/i)).toBeDefined();
    expect(
      screen.getByText("Removed from the list, form counts, and exports."),
    ).toBeDefined();
  });

  it("emphasizes Your for owned submissions", () => {
    const content = deleteSuccessToastContent("owned");
    render(<div>{content.title}</div>);

    expect(screen.getByText("Your")).toBeDefined();
    expect(screen.getByText(/submission deleted/i)).toBeDefined();
  });

  it("emphasizes Respondent for respondent submissions", () => {
    const content = deleteSuccessToastContent("respondent");
    render(<div>{content.title}</div>);

    expect(screen.getByText("Respondent")).toBeDefined();
    expect(screen.getByText(/submission deleted/i)).toBeDefined();
  });
});
