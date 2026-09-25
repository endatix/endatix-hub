"use client";

import {
  useNearViewport,
  usePrivateStorageDisplayUrl,
} from "@/features/asset-storage/client";
import { FileKindIcon } from "@/components/common/file-kind-icon";
import { FILE_KINDS, fileKindFromExtension } from "@/lib/file-kinds";
import { FileType, getFileType, IFile } from "@/lib/questions/file/file-type";
import { AudioPlayer } from "@/lib/questions/audio-recorder/audio-player";
import { cn } from "@/lib/utils";
import { FileText, FileX2, Play } from "lucide-react";
import { useCallback, useRef } from "react";

export type FileViewSize = "small" | "medium" | "large";

export interface FileContentViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** For private files, use the resolved URL (with token). */
  src: string;
  contentType?: string;
  name?: string;
  /** Size variant: small (submission details), medium (modal), large (file page). Default: large. */
  size?: FileViewSize;
  /** medium/large: name + type under the preview (default true). */
  showCaption?: boolean;
  /** small only: opens the file details dialog. */
  onOpen?: () => void;
  /** small only: the thumbnail media failed to load (e.g. expired read token). */
  onMediaError?: () => void;
}

const SIZE_CONFIG = {
  medium: {
    container: "w-full max-w-2xl mx-auto",
    // Leaves room for the details panel and actions inside the dialog/drawer.
    image: "h-auto w-full max-h-[min(55vh,40rem)] object-contain",
    video: "max-h-[400px] w-full",
    pdfIcon: "h-10 w-10",
    unknownIcon: "h-10 w-10",
  },
  large: {
    container: "w-full max-w-4xl mx-auto",
    image: "h-auto w-full max-h-[min(70vh,40rem)] object-contain",
    video: "max-h-[500px] w-full",
    pdfIcon: "h-10 w-10",
    unknownIcon: "h-10 w-10",
  },
} as const;

/** Thumbnail tile: fixed height, width follows the file, clamped. See DESIGN.md §5 File Answers. */
const THUMBNAIL_WIDTH = "w-fit min-w-40 max-w-72";

/**
 * Presentational file viewer for image, video, audio, PDF, and unknown types.
 * Does not use AssetStorage context; pass a fully resolved URL as src.
 *
 * Images use a native {@link HTMLImageElement} (not `next/image`): presigned S3/SAS URLs and
 * Private object URLs (SAS or S3 presigned) carry long query strings; Next 16+ rejects those on `next/image`
 * unless every pattern is listed in `images.remotePatterns` / `images.localPatterns`, which
 * does not fit short-lived tokens.
 *
 * @param size - small (submission details thumbnail), medium (modal), large (file page)
 */
export function FileContentView({
  src,
  contentType,
  name,
  size = "large",
  showCaption = true,
  onOpen,
  onMediaError,
  className,
  ...props
}: Readonly<FileContentViewProps>) {
  const fileType = getFileType({
    content: src,
    type: contentType,
    name,
  });

  if (size === "small") {
    return (
      <FileThumbnail
        src={src}
        contentType={contentType}
        name={name}
        fileType={fileType}
        onOpen={onOpen}
        onMediaError={onMediaError}
        className={className}
      />
    );
  }

  const config = SIZE_CONFIG[size];

  return (
    <div className={cn("space-y-3", config.container, className)} {...props}>
      <div className="overflow-hidden rounded-md">
        {fileType === FileType.Image && (
          <div className="flex items-center justify-center bg-muted">
            <img
              src={src}
              alt={name ?? ""}
              loading="lazy"
              className={config.image}
            />
          </div>
        )}
        {fileType === FileType.Video && (
          <video
            src={src}
            controls
            className={cn(config.video, "bg-muted object-contain")}
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
        {fileType === FileType.Document && (
          <div className="flex min-h-[400px] w-full flex-col gap-2">
            <object
              data={src}
              type={contentType ?? "application/pdf"}
              className="min-h-[400px] w-full rounded-md border"
              aria-label={name ?? "PDF document"}
            >
              <div className="flex h-[230px] items-center justify-center gap-2 bg-muted">
                <FileText className={config.pdfIcon} />
                <a
                  href={src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open PDF
                </a>
              </div>
            </object>
          </div>
        )}
        {fileType === FileType.Unknown && (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-md border bg-muted">
            <FileX2 className={config.unknownIcon} />
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Download file
            </a>
          </div>
        )}
      </div>
      {showCaption && (name || contentType) && (
        <div className="space-y-1 text-sm">
          {name && <h3 className="leading-none font-medium">{name}</h3>}
          {contentType && (
            <p className="text-xs text-muted-foreground">{contentType}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface FileThumbnailProps {
  src: string;
  contentType?: string;
  name?: string;
  fileType: FileType;
  onOpen?: () => void;
  onMediaError?: () => void;
  className?: string;
}

/**
 * One file in a submission's file answer. The tile is a single button that opens the
 * details dialog (fresh URL, metadata, download); audio keeps its inline player and
 * puts that button on the caption instead.
 */
function FileThumbnail({
  src,
  contentType,
  name,
  fileType,
  onOpen,
  onMediaError,
  className,
}: Readonly<FileThumbnailProps>) {
  const openLabel = `View details for ${name ?? "file"}`;
  const caption = <ThumbnailCaption name={name} contentType={contentType} />;

  if (fileType === FileType.Audio) {
    return (
      <div className={cn("w-72 space-y-3", className)}>
        <div className="flex h-40 items-center rounded-md bg-muted px-2">
          <AudioPlayer
            file={{ content: src, name, type: contentType }}
            isDisplayMode
          />
        </div>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={openLabel}
            className="block w-full cursor-pointer rounded-sm text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {caption}
          </button>
        ) : (
          caption
        )}
      </div>
    );
  }

  const tile = (
    <>
      <div className="flex h-40 items-center justify-center overflow-hidden rounded-md bg-muted transition-opacity group-hover:opacity-90">
        <ThumbnailPreview
          src={src}
          contentType={contentType}
          name={name}
          fileType={fileType}
          onMediaError={onMediaError}
        />
      </div>
      {caption}
    </>
  );

  if (!onOpen) {
    return (
      <div className={cn(THUMBNAIL_WIDTH, "space-y-3", className)}>{tile}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={openLabel}
      className={cn(
        THUMBNAIL_WIDTH,
        "group block cursor-pointer space-y-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      {tile}
    </button>
  );
}

function ThumbnailPreview({
  src,
  contentType,
  name,
  fileType,
  onMediaError,
}: Readonly<Omit<FileThumbnailProps, "onOpen" | "className">>) {
  if (fileType === FileType.Image) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={onMediaError}
        className="h-40 w-auto max-w-full object-contain"
      />
    );
  }

  if (fileType === FileType.Video) {
    // First frame as a poster (`#t=0.1` makes Safari paint it); playback happens in the dialog.
    return (
      <div className="relative flex h-40 max-w-full items-center justify-center">
        <video
          src={`${src}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          aria-hidden
          onError={onMediaError}
          className="h-40 w-auto max-w-full object-contain"
        >
          <source src={src} type={contentType} />
        </video>
        <span className="absolute flex size-10 items-center justify-center rounded-full bg-background/85 shadow-sm">
          <Play aria-hidden className="size-4 translate-x-px fill-current" />
        </span>
      </div>
    );
  }

  const kind = fileKindFromExtension(name?.split(".").pop() ?? "");
  return (
    <div className="flex w-40 flex-col items-center justify-center gap-2 px-3">
      <FileKindIcon kind={kind} className="size-8" />
      <span className="text-xs text-muted-foreground">
        {kind ? FILE_KINDS[kind].label : "File"}
      </span>
    </div>
  );
}

function ThumbnailCaption({
  name,
  contentType,
}: Readonly<{ name?: string; contentType?: string }>) {
  if (!name && !contentType) {
    return null;
  }

  return (
    <div className="space-y-1 text-sm">
      {name && (
        <p className="truncate font-medium" title={name}>
          {name}
        </p>
      )}
      {contentType && (
        <p className="truncate text-xs text-muted-foreground">{contentType}</p>
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
  /** small only: opens the file details dialog. */
  onOpen?: () => void;
}

function FileViewerPlaceholder({ size }: Readonly<{ size: FileViewSize }>) {
  if (size === "small") {
    return (
      <div className="w-40 space-y-3" aria-hidden>
        <div className="h-40 animate-pulse rounded-md bg-muted" />
        <div className="space-y-1">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }
  return (
    <div
      className="min-h-[200px] w-full animate-pulse rounded-md bg-muted"
      aria-hidden
    />
  );
}

/** File viewer that resolves storage URLs via AssetStorage context (for survey answers). */
export function FileViewer({
  file,
  size = "large",
  lazyPresign = size === "small",
  onOpen,
  className,
  ...props
}: FileViewerProps) {
  const { ref, isNearViewport } = useNearViewport({ disabled: !lazyPresign });
  const presignEnabled = !lazyPresign || isNearViewport;
  const {
    displayUrl: src,
    isResolving,
    refresh,
  } = usePrivateStorageDisplayUrl(file.content, { enabled: presignEnabled });

  // Re-sign once per failing URL: an expired token recovers, a missing file does not loop.
  const refreshedFor = useRef<string | null>(null);
  const handleMediaError = useCallback(() => {
    if (refreshedFor.current === src) {
      return;
    }
    refreshedFor.current = src;
    refresh();
  }, [refresh, src]);

  const showMedia = presignEnabled && (!isResolving || src.length > 0);

  return (
    <div ref={ref} className={className} {...props}>
      {showMedia ? (
        <FileContentView
          src={src}
          contentType={file.type}
          name={file.name}
          size={size}
          onOpen={onOpen}
          onMediaError={handleMediaError}
        />
      ) : (
        <FileViewerPlaceholder size={size} />
      )}
    </div>
  );
}
