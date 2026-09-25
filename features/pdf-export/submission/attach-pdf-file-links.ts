import { parseSubmissionFileUrl } from "@/features/asset-storage/utils";
import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/core";
import { withBasePath } from "@/lib/hosting";
import type { IFile } from "@/lib/questions/file/file-type";
import type { Model } from "survey-core";

/**
 * `hub`: the reader signed in to the Hub to export, so links go to the Hub file
 * page, which signs a fresh URL on every open and never expires.
 * `signed`: the reader may have no Hub account (share-link export), so links stay
 * on the signed storage URL, which stops working when its read token expires.
 */
export type PdfFileLinkMode = "hub" | "signed";

export interface AttachPdfFileLinksOptions {
  mode: PdfFileLinkMode;
  /** Absolute Hub origin, e.g. `https://hub.example.com`. */
  hubOrigin: string;
  storageConfig: ClientStorageConfig | null;
}

/**
 * Stamps `pdfLink` on every file-question value before rendering. Must run before
 * {@link downscalePdfFileImages}, which swaps image content for an inline copy.
 */
export function attachPdfFileLinks(
  model: Model,
  options: AttachPdfFileLinksOptions,
): void {
  const fileQuestions = model
    .getAllQuestions()
    .filter((question) => question.getType() === "file");

  for (const question of fileQuestions) {
    if (!Array.isArray(question.value)) {
      continue;
    }

    question.value = (question.value as IFile[]).map((file) => ({
      ...file,
      ...resolvePdfFileLink(file, options),
    }));
  }
}

export function resolvePdfFileLink(
  file: IFile,
  { mode, hubOrigin, storageConfig }: AttachPdfFileLinksOptions,
): Pick<IFile, "pdfLink" | "pdfLinkIsTemporary"> {
  const content = file.content ?? "";
  if (!/^https?:\/\//i.test(content)) {
    // Inline data is embedded (images) or has nowhere to link to.
    return {};
  }

  const stored = parseSubmissionFileUrl(withoutQuery(content), storageConfig);

  if (stored && mode === "hub") {
    const path = withBasePath(
      `/forms/${encodeURIComponent(stored.formId)}/submissions/${encodeURIComponent(stored.submissionId)}/files/${encodeURIComponent(stored.fileName)}`,
    );
    return { pdfLink: `${hubOrigin.replace(/\/+$/, "")}${path}` };
  }

  const isSigned = stored !== null && content !== withoutQuery(content);
  return { pdfLink: content, pdfLinkIsTemporary: isSigned || undefined };
}

function withoutQuery(url: string): string {
  const queryStart = url.indexOf("?");
  return queryStart === -1 ? url : url.slice(0, queryStart);
}
