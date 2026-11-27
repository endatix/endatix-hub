import type { ConversionSession, ImageSnapshot } from "./conversion-session";
import type { StoreImage } from "../rich-text/ui/image-upload-context";
import type { EmbeddedFile } from "./embedded-images";

interface Transfer {
  signal: AbortSignal;
  store: StoreImage;
  progress: (message: string) => void;
}

export async function convertImages(
  session: ConversionSession,
  snapshot: ImageSnapshot,
  transfer: Transfer,
) {
  const remaining = snapshot.inventory.files.filter(file => !session.uploads.has(file.key));
  for (const [index, image] of remaining.entries()) {
    if (transfer.signal.aborted) return "cancelled";
    if (!session.current(snapshot)) return "stale";
    transfer.progress(`Uploading file ${index + 1} of ${remaining.length}`);
    try {
      await session.storeOnce(image.key, () => transfer.store(originalFile(image, index)));
    } catch {
      return transfer.signal.aborted ? "cancelled" : { failed: image.location };
    }
  }
  if (transfer.signal.aborted) return "cancelled";
  return session.apply(snapshot);
}

function originalFile(image: EmbeddedFile, index: number) {
  return new File([image.bytes], `image-${index + 1}.${image.extension}`, { type: image.mime });
}
