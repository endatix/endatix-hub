import { render, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { FormRuntimeProvider } from "@/lib/form-runtime/form-runtime.context";
import { clientStorageConfig } from "../../__tests__/test-storage-config";
import { AssetStorageClientProvider } from "../asset-storage.context";
import { RichTextImageDisplay } from "../rich-text-image-display";

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
            <img alt="Template logo" src={src} />
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
