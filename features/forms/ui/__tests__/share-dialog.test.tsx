import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareDialog } from "../share-dialog";

describe("ShareDialog", () => {
  async function openEmbedCodeTab() {
    render(<ShareDialog formId="123" open onOpenChange={() => {}} />);

    // Radix's TabsTrigger switches tabs on mousedown, not click.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /embed code/i }), {
      button: 0,
    });

    // Wait for a signal unique to the embed-code panel (the height-mode
    // radio group) before touching the textarea, since the "share link"
    // panel also renders a read-only textbox-role input.
    await screen.findByRole("radiogroup");

    return screen.getByRole("textbox") as HTMLTextAreaElement;
  }

  it("omits data-height-mode from the default auto-resize snippet", async () => {
    const textarea = await openEmbedCodeTab();

    expect(textarea.value).toContain('data-form-id="123"');
    expect(textarea.value).not.toContain("data-height-mode");
  });

  it('adds data-height-mode="fill" when Fill container is selected, without wrapping the script', async () => {
    await openEmbedCodeTab();

    fireEvent.click(screen.getByRole("radio", { name: /fill container/i }));

    await waitFor(() => {
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      // No wrapper div: customers embedding fill mode into their own
      // existing sized container shouldn't have to strip one out first.
      expect(textarea.value).toContain('data-height-mode="fill"');
      expect(textarea.value).not.toContain("<div");
      expect(textarea.value.trim().startsWith("<script")).toBe(true);
    });
  });

  it("removes data-height-mode again when switching back to Auto-resize", async () => {
    await openEmbedCodeTab();

    fireEvent.click(screen.getByRole("radio", { name: /fill container/i }));
    await waitFor(() => {
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).toContain("data-height-mode");
    });

    fireEvent.click(screen.getByRole("radio", { name: /auto-resize/i }));
    await waitFor(() => {
      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
      expect(textarea.value).not.toContain("data-height-mode");
    });
  });
});
