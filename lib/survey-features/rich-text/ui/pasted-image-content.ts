import type Quill from "quill";
import type { StoreImage } from "./image-upload-context";
import { fileLabel } from "./image-label";

async function clipboardFile(source: string, attachment?: File) {
  if (!/^data:image\//i.test(source)) {
    if (attachment) return attachment;
    throw new Error("Missing clipboard image");
  }
  const blob = await (await fetch(source)).blob();
  return new File([blob], `paste.${blob.type.split("/")[1]}`, {
    type: blob.type,
  });
}

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
  const replacements = localImages(template, clipboard, store);
  if (!replacements.length) return;
  const formats = editor.getFormat();
  return async (signal: AbortSignal) => {
    for (const replace of replacements) await replace(signal);
    return editor.clipboard.convert({ html: template.innerHTML }, formats);
  };
}

function localImages(template: HTMLTemplateElement, clipboard: DataTransfer, store: StoreImage) {
  const attachments = Array.from(clipboard.files).filter(file => file.type.startsWith("image/"));
  const images = Array.from(template.content.querySelectorAll<HTMLImageElement>("img[src]"));
  return images.filter(image => /^(data:image\/|cid:|blob:|file:)/i.test(image.src))
    .map((image, index) => {
      const source = image.src;
      return async (signal: AbortSignal) => {
        if (image.src !== source) return;
        signal.throwIfAborted();
        const attachment = attachments[index];
        const file = await clipboardFile(source, attachment);
        signal.throwIfAborted();
        image.src = await store(file);
        const label = fileLabel(attachment?.name ?? file.name);
        if (label) {
          image.dataset.imageLabel = label;
          if (!image.hasAttribute("alt")) image.alt = label;
        }
      };
    });
}
