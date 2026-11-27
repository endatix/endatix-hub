import type { ConversionSession, ImageSnapshot } from "./conversion-session";
import type { StoreImage } from "../rich-text/ui/image-upload-context";

interface Transfer {
  signal: AbortSignal;
  store: StoreImage;
  progress: (message: string) => void;
}

export async function convertImages(session: ConversionSession, snapshot: ImageSnapshot, transfer: Transfer) {
  const remaining = snapshot.inventory.files.filter(file => !session.uploads.has(file.key));
  for (const [index, image] of remaining.entries()) {
    if (transfer.signal.aborted) return "cancelled";
    if (!session.current(snapshot)) return "stale";
    transfer.progress(`Uploading file ${index + 1} of ${remaining.length}`);
    try {
      const file = new File([image.bytes], `image-${index + 1}.${image.extension}`, { type: image.mime });
      session.uploads.set(image.key, await transfer.store(file));
    } catch {
      return transfer.signal.aborted ? "cancelled" : { failed: image.location };
    }
  }
  if (transfer.signal.aborted) return "cancelled";
  if (!session.current(snapshot)) return "stale";
  session.apply(snapshot);
  return "converted";
}
