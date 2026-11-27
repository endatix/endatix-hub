import { render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import { clientStorageConfig } from "../../__tests__/test-storage-config";
import { AssetStorageClientProvider } from "../asset-storage.context";
import { RichTextImageDisplay } from "../rich-text-image-display";

const storedImage = (src: string) => <img alt="Stored image" src={src} />;

it("restores an inline editor's original source before focus reaches the editor", async () => {
  // Arrange
  const config = clientStorageConfig({ isPrivate: true });
  const src = `https://${config.hostName}/content/t/2/img.png`;
  const signed = `${src}?signature=temporary`;
  const fetchRead = vi.fn().mockResolvedValue(Response.json({ resolved: { [src]: { url: signed } } }));
  vi.stubGlobal("fetch", fetchRead);
  const { getByRole } = render(
    <FormRuntimeProvider initialState={{ formId: "1" }}>
      <AssetStorageClientProvider config={config}>
        <RichTextImageDisplay>
          <span className="sv-string-editor--html" role="textbox" tabIndex={0} contentEditable suppressContentEditableWarning>
            {storedImage(src)}
          </span>
        </RichTextImageDisplay>
      </AssetStorageClientProvider>
    </FormRuntimeProvider>,
  );

  // Act
  const image = getByRole("img");
  await waitFor(() => expect(image.getAttribute("src")).toBe(signed));
  getByRole("textbox").focus();

  // Assert
  expect(image.getAttribute("src")).toBe(src);
  expect(JSON.parse(fetchRead.mock.calls[0][1].body)).toEqual({ formId: "1", richTextImages: [src] });
});

it("keeps private display credentials outside editable the editor HTML", async () => {
  // Arrange
  const config = clientStorageConfig({ isPrivate: true });
  const src = `https://${config.hostName}/content/f/1/image.png`;
  const signed = `${src}?signature=temporary`;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ resolved: { [src]: { url: signed } } })));
  const { container, getByRole } = render(
    <FormRuntimeProvider initialState={{ formId: "1" }}>
      <AssetStorageClientProvider config={config}>
        <RichTextImageDisplay>
          <div id="editor" className="rich-text-editor">
            <div className="tiptap" contentEditable suppressContentEditableWarning>
              {storedImage(src)}
            </div>
          </div>
        </RichTextImageDisplay>
      </AssetStorageClientProvider>
    </FormRuntimeProvider>,
  );

  // Act
  const editable = container.querySelector(".tiptap")!;
  await waitFor(() => expect(container.querySelector("style[data-image-preview]")?.textContent).toContain("temporary"));
  (editable as HTMLElement).focus();

  // Assert
  expect(editable.innerHTML).not.toContain("temporary");
  expect(getByRole("img").getAttribute("src")).toBe(src);
});
