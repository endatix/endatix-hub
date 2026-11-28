import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithBrand } from "@/test/render-with-brand";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { DefineFormResponse } from "@/lib/endatix-api/agents/types";
import { defineFormAction } from "../../../application/actions/define-form.action";
import { FormAssistantProvider } from "../../../use-cases/design-form";
import ChatBox from "../chat-box";

vi.mock("../../../application/actions/define-form.action", () => ({ defineFormAction: vi.fn() }));
vi.mock("../../../use-cases/design-form/generate-form-for-conversation.action", () => ({ generateFormForConversationAction: vi.fn() }));

function reply(definition: string) {
  return ApiResult.success({
    agentId: "1", threadId: "2", userPrompt: { id: "3", content: "edit" },
    agentResponse: { id: "4", content: "answer", definition },
  });
}

it.each([
  [ApiResult.validationError<DefineFormResponse>("Request failed"), "Request failed"],
  [reply("{invalid"), "Error parsing definition"],
] as const)("a failed prompt never reapplies the previous successful proposal", async (failure, message) => {
  // Arrange
  const apply = vi.fn();
  vi.mocked(defineFormAction).mockResolvedValueOnce(reply('{"title":"Earlier"}')).mockResolvedValueOnce(failure);
  renderWithBrand(<FormAssistantProvider isAssistantEnabled><ChatBox onFormGenerated={apply} /></FormAssistantProvider>);
  const field = screen.getByRole("textbox");
  function submit(text: string) {
    fireEvent.change(field, { target: { value: text } });
    fireEvent.click(field.closest("form")!.querySelector('button[type="submit"]')!);
  }

  // Act
  submit("First request");
  await waitFor(() => expect(apply).toHaveBeenCalledTimes(1));
  submit("Second request");

  // Assert
  await screen.findByText(message);
  expect(apply).toHaveBeenCalledTimes(1);
  expect(field).toHaveProperty("value", "Second request");
});
