import {
  useNearViewport,
  usePrivateStorageDisplayUrl,
} from '@/features/asset-storage/client';
import { FileType, getFileType, IFile } from "@/lib/questions/file/file-type";
import { AudioPlayer } from "@/lib/questions/audio-recorder/audio-player";
import { cn } from "@/lib/utils";
import { FileText, FileX2 } from "lucide-react";
import Link from "next/link";

export type FileViewSize = "small" | "medium" | "large";

export interface FileContentViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** For private files, use the resolved URL (with token). */
  src: string;
  contentType?: string;
  name?: string;
  /** Size variant: small (submission details), medium (modal), large (file page). Default: large. */
  size?: FileViewSize;
}

const SIZE_CONFIG = {
  small: {
    container: "w-[200px]",
    imageContainer: "relative w-[200px] h-[266px]",
    imageAspect: "aspect-[3/4]",
    video: "h-[150px] w-auto",
    pdfIcon: "h-8 w-8",
    unknownIcon: "h-8 w-8",
  },
  medium: {
    container: "w-full max-w-2xl mx-auto",
    imageContainer: "relative w-full aspect-square",
    imageAspect: "aspect-square",
    video: "h-[400px] w-auto",
    pdfIcon: "h-10 w-10",
    unknownIcon: "h-10 w-10",
  },
  large: {
    container: "w-full max-w-4xl mx-auto",
    imageContainer: "relative w-full aspect-square",
    imageAspect: "aspect-square",
    video: "h-[500px] w-auto",
    pdfIcon: "h-10 w-10",
    unknownIcon: "h-10 w-10",
  },
} as const;

/**
 * Presentational file viewer for image, video, audio, PDF, and unknown types.
 * Does not use AssetStorage context; pass a fully resolved URL as src.
 *
 * Images use a native {@link HTMLImageElement} (not `next/image`): presigned S3/SAS URLs and
 * Private object URLs (SAS or S3 presigned) carry long query strings; Next 16+ rejects those on `next/image`
 * unless every pattern is listed in `images.remotePatterns` / `images.localPatterns`, which
 * does not fit short-lived tokens.
 *
 * @param size - small (submission details), medium (modal), large (file page)
 */
export function FileContentView({
  src,
  contentType,
  name,
  size = "large",
  className,
  ...props
}: Readonly<FileContentViewProps>) {
  const fileType = getFileType({
    content: src,
    type: contentType,
    name,
  });

  const config = SIZE_CONFIG[size];
  const showPdfObject = size === "medium" || size === "large";

  return (
    <div className={cn("space-y-3", config.container, className)} {...props}>
      <div className="overflow-hidden rounded-md">
        {fileType === FileType.Image && (
          <div className={config.imageContainer}>
            <img
              src={src}
              alt={name ?? ""}
              loading="lazy"
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-all hover:scale-105",
                config.imageAspect,
              )}
            />
          </div>
        )}
        {fileType === FileType.Video && (
          <video
            src={src}
            controls
            className={cn(config.video, "object-cover transition-all")}
          >
            <source src={src} type={contentType} />
            <track kind="captions" />
          </video>
        )}
        {fileType === FileType.Audio && (
          <AudioPlayer
            file={{ content: src, name, type: contentType }}
            isDisplayMode
          />
        )}
        {fileType === FileType.Document && showPdfObject && (
          <div className="flex min-h-[400px] w-full flex-col gap-2">
            <object
              data={src}
              type={contentType ?? "application/pdf"}
              className="min-h-[400px] w-full rounded-md border"
              aria-label={name ?? "PDF document"}
            >
              <div className="flex h-[230px] items-center justify-center gap-2 bg-muted">
                <FileText className={config.pdfIcon} />
                <Link
                  href={{ pathname: src }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open PDF
                </Link>
              </div>
            </object>
          </div>
        )}
        {fileType === FileType.Document && !showPdfObject && (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-md border bg-muted">
            <FileText className={config.pdfIcon} />
            <Link
              href={{ pathname: src }}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {name ?? "Open PDF"}
            </Link>
          </div>
        )}
        {fileType === FileType.Unknown && (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-md border bg-muted">
            <FileX2 className={config.unknownIcon} />
            <Link
              href={{ pathname: src }}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Download file
            </Link>
          </div>
        )}
      </div>
      {(name || contentType) && (
        <div className="space-y-1 text-sm">
          {name && <h3 className="font-medium leading-none">{name}</h3>}
          {contentType && (
            <p className="text-xs text-muted-foreground">{contentType}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface FileViewerProps extends React.HTMLAttributes<HTMLDivElement> {
  file: IFile;
  /** Size variant: small (submission details), medium (modal), large (file page). Default: large. */
  size?: FileViewSize;
  /** Defer presign and media src until near viewport (default: true for small thumbnails). */
  lazyPresign?: boolean;
}

function FileViewerPlaceholder({ size }: Readonly<{ size: FileViewSize }>) {
  const heightClass =
    size === "small" ? "min-h-[266px] w-[200px]" : "min-h-[200px] w-full";
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", heightClass)}
      aria-hidden
    />
  );
}

/** File viewer that resolves storage URLs via AssetStorage context (for survey answers). */
export function FileViewer({
  file,
  size = "large",
  lazyPresign = size === "small",
  className,
  ...props
}: FileViewerProps) {
  const { ref, isNearViewport } = useNearViewport({ disabled: !lazyPresign });
  const presignEnabled = !lazyPresign || isNearViewport;
  const { displayUrl: src, isResolving } = usePrivateStorageDisplayUrl(
    file.content,
    { enabled: presignEnabled },
  );

  const showMedia =
    presignEnabled && (!isResolving || src.length > 0);

  return (
    <div ref={ref} className={className} {...props}>
      {showMedia ? (
        <FileContentView
          src={src}
          contentType={file.type}
          name={file.name}
          size={size}
        />
      ) : (
        <FileViewerPlaceholder size={size} />
      )}
    </div>
  );
}
