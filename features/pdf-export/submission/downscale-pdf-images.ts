import {
  FileType,
  getFileType,
  type IFile,
} from "@/lib/questions/file/file-type";
import { Model } from "survey-core";
import sharp from "sharp";

/** Longest edge kept in the PDF. A4 at ~150 dpi is about this wide. */
const MAX_EDGE_PX = 1200;
const JPEG_QUALITY = 72;
const FETCH_TIMEOUT_MS = 15_000;
/** Reject a source before sharp allocates for it. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const DOWNSCALE_CONCURRENCY = 4;

/**
 * Replaces file-question image URLs with a resized JPEG data URI so the PDF
 * stores a print-sized picture instead of the original upload.
 * A fetch or decode failure leaves that file on its original URL.
 */
export async function downscalePdfFileImages(model: Model): Promise<void> {
  // Third arg includes questions nested in paneldynamic (PdfPanelDynamicAnswer renders them).
  const fileQuestions = model
    .getAllQuestions(false, false, true)
    .filter((question) => question.getType() === "file");

  await mapPool(fileQuestions, DOWNSCALE_CONCURRENCY, async (question) => {
    if (!Array.isArray(question.value)) {
      return;
    }
    const files = question.value as IFile[];
    question.value = await mapPool(files, DOWNSCALE_CONCURRENCY, downscaleFile);
  });
}

async function downscaleFile(file: IFile): Promise<IFile> {
  if (getFileType(file) !== FileType.Image) {
    return file;
  }

  try {
    const bytes = await loadImageBytes(file.content);
    if (!bytes) {
      return file;
    }

    const resized = await sharp(bytes, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    const meta = await sharp(resized).metadata();

    return {
      ...file,
      content: `data:image/jpeg;base64,${resized.toString("base64")}`,
      type: "image/jpeg",
      pdfWidth: meta.width,
      pdfHeight: meta.height,
    };
  } catch {
    return file;
  }
}

async function loadImageBytes(source: string): Promise<Buffer | null> {
  if (source.startsWith("data:image/")) {
    const comma = source.indexOf(",");
    if (comma < 0) {
      return null;
    }
    const payload = source.slice(comma + 1);
    // Base64 expands ~4/3; reject before allocating the decoded buffer.
    if (Math.floor((payload.length * 3) / 4) > MAX_SOURCE_BYTES) {
      return null;
    }
    const bytes = Buffer.from(payload, "base64");
    return bytes.length > MAX_SOURCE_BYTES ? null : bytes;
  }

  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    return null;
  }

  const response = await fetch(source, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return null;
  }

  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_SOURCE_BYTES) {
    return null;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.length > MAX_SOURCE_BYTES ? null : bytes;
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  mapItem: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapItem(items[index]);
    }
  }

  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
