import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CustomQuestionDialog,
  type CustomQuestionRequest,
} from "../custom-question-dialog";

afterEach(cleanup);

function makeRequest(
  overrides: Partial<CustomQuestionRequest> = {},
): CustomQuestionRequest {
  return {
    elementName: "question1",
    defaultName: "",
    defaultTitle: "",
    onSubmit: vi.fn(),
    ...overrides,
  };
}

describe("CustomQuestionDialog", () => {
  it("renders nothing when no question is pending", () => {
    const { container } = render(
      <CustomQuestionDialog request={null} onClose={vi.fn()} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("prefills from the designer element and submits trimmed values", () => {
    const request = makeRequest({
      elementName: "npsScore",
      defaultName: "npsScore",
      defaultTitle: "Nps Score",
    });
    const onClose = vi.fn();
    render(<CustomQuestionDialog request={request} onClose={onClose} />);

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
      "npsScore",
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "  How likely are you to recommend us?  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save question" }));

    expect(request.onSubmit).toHaveBeenCalledWith(
      "npsScore",
      "How likely are you to recommend us?",
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("requires both a name and a title", () => {
    const request = makeRequest();
    render(<CustomQuestionDialog request={request} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Save question" }));

    expect(screen.getByText("Question name is required")).toBeTruthy();
    expect(screen.getByText("Question title is required")).toBeTruthy();
    expect(request.onSubmit).not.toHaveBeenCalled();
  });
});
