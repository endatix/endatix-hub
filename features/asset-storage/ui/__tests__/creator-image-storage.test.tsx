import { mountedEditor, paste } from "@/lib/survey-features/rich-text/__tests__/field-fixture";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { RichTextField } from "@/lib/survey-features/rich-text/ui/rich-text-field";
import { clientStorageConfig } from "../../__tests__/test-storage-config";
import { AssetStorageClientProvider } from "../asset-storage.context";
import { CreatorImageStorage } from "../creator-image-storage";

function renderEditor(itemType: "form" | "template") {
  render(
    <AssetStorageClientProvider config={clientStorageConfig()}>
      <CreatorImageStorage itemId="123" itemType={itemType}>
        <RichTextField value="Before After" />
      </CreatorImageStorage>
    </AssetStorageClientProvider>,
  );
  return mountedEditor();
}

const image = new File(["pixels"], "example.png", { type: "image/png" });

it.each(["form", "template"] as const)("retries the %s upload and inserts only the unsigned URL", async itemType => {
  // Arrange
  const src = "https://testaccount.blob.core.windows.net/content/example.png";
  const grant = { url: `${src}?sig=temporary`, headers: { "x-ms-blob-type": "BlockBlob" } };
  const request = vi.fn()
    .mockResolvedValueOnce(Response.json({ detail: "Unavailable" }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ uploads: { [image.name]: grant } }))
    .mockResolvedValueOnce(new Response(null, { status: 201 }));
  vi.stubGlobal("fetch", request);
  const editor = renderEditor(itemType);

  // Act
  act(() => { editor.commands.setTextSelection(8); paste(editor, "", [image]); });
  const retry = await screen.findByRole("button", { name: "Retry" });
  expect(editor.getText()).toBe("Before After");
  fireEvent.click(retry);

  // Assert
  await waitFor(() => expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.src).toBe(src));
  expect(editor.getText()).toBe("Before After");
  expect(editor.getHTML()).not.toContain("?sig");
  expect(JSON.parse(request.mock.calls[1][1].body)).toMatchObject({ itemType, itemId: "123" });
  expect(request.mock.calls[2]).toEqual([grant.url, expect.objectContaining({ method: "PUT", headers: grant.headers })]);
});

it("dismisses a failed image without modifying the rich text", async () => {
  // Arrange
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 503 })));
  const editor = renderEditor("form");
  const original = editor.getJSON();

  // Act
  act(() => { editor.commands.setTextSelection({ from: 1, to: 7 }); paste(editor, "", [image]); });
  await screen.findByRole("button", { name: "Retry" });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  // Assert
  await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  expect(editor.getJSON()).toEqual(original);
});
