import type Quill from "quill";
import type { StoreImage } from "./image-upload-context";

import { clipboardImageFiles, ClipboardImageError } from "./clipboard-image-files";

/** Keep the clipboard's formatting and external links; replace only local image sources. */
export function pastedImageContent(
  editor: Quill,
  clipboard: DataTransfer,
  store: StoreImage,
) {
  const html = clipboard.getData("text/html");
  if (!html) return;
  const template = document.createElement("template");
  template.innerHTML = html;
  const images = Array.from(template.content.querySelectorAll<HTMLImageElement>("img[src]"))
    .filter(image => /^(data:image\/|cid:|blob:|file:)/i.test(image.src));
  if (!images.length) return;
  const attachments = Array.from(clipboard.files).filter(file => file.type.startsWith("image/"));
  const formats = editor.getFormat();
  const upload = uploadImages(images, attachments, store);
  return async (signal: AbortSignal) => {
    await upload(signal);
    return editor.clipboard.convert({ html: template.innerHTML }, formats);
  };
}

function uploadImages(images: HTMLImageElement[], attachments: File[], store: StoreImage) {
  const files = clipboardImageFiles(images, attachments).catch(() => { throw new ClipboardImageError(); });
  let next = 0;
  return async (signal: AbortSignal) => {
    const placements = await files;
    while (next < placements.length) {
      signal.throwIfAborted();
      const { image, file } = placements[next];
      image.src = await store(file);
      next++;
    }
  };
}
