export class ClipboardImageError extends Error {
  constructor() {
    super("Could not match the pasted images. Paste them separately or choose an image file.");
  }
}

async function inlineFile(source: string) {
  const response = await fetch(source);
  const type = response.headers.get("content-type") ?? "image/png";
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { type, bytes };
}

async function takeInlineAttachment(files: File[], bytes: Uint8Array) {
  for (const [index, file] of files.entries()) {
    if (file.size !== bytes.length) continue;
    const attached = new Uint8Array(await file.arrayBuffer());
    if (bytes.every((byte, i) => attached[i] === byte)) return files.splice(index, 1)[0];
  }
}

/** Clipboard File has no Content-ID. Match redundant inline bytes first; the
 * remaining file-backed occurrences use the browser's existing file order. */
export async function clipboardImageFiles(images: HTMLImageElement[], attachments: File[]) {
  const remaining = [...attachments];
  const inline = new Map<HTMLImageElement, File>();
  for (const image of images) {
    if (!/^data:image\//i.test(image.src)) continue;
    const { bytes, type } = await inlineFile(image.src);
    const attachment = await takeInlineAttachment(remaining, bytes);
    inline.set(image, new File([bytes], attachment?.name ?? `paste.${type.split("/")[1]}`, { type }));
  }
  const needed = images.length - inline.size;
  if (needed && remaining.length !== needed) throw new ClipboardImageError();
  let index = 0;
  return images.map(image => ({ image, file: inline.get(image) ?? remaining[index++] }));
}
