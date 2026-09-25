import { FileType, getFileType, type IFile } from "@/lib/questions/file/file-type";
import { Model } from "survey-core";
import sharp from "sharp";

/** Longest edge kept in the PDF. A4 at ~150 dpi is about this wide. */
const MAX_EDGE_PX = 1200;
const JPEG_QUALITY = 72;
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Replaces file-question image URLs with a resized JPEG data URI so the PDF
 * stores a print-sized picture instead of the original upload.
 * A fetch or decode failure leaves that file on its original URL.
 */
export async function downscalePdfFileImages(model: Model): Promise<void> {
  const fileQuestions = model
    .getAllQuestions()
    .filter((question) => question.getType() === "file");

  await Promise.all(
    fileQuestions.map(async (question) => {
      if (!Array.isArray(question.value)) {
        return;
      }

      const files = question.value as IFile[];
      question.value = await Promise.all(files.map(downscaleFile));
    }),
  );
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
    return Buffer.from(source.slice(comma + 1), "base64");
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

  return Buffer.from(await response.arrayBuffer());
}
