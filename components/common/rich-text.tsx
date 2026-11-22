"use client";

import { cn } from "@/lib/utils";
import {
  EMPTY_IMAGE_SOURCE_POLICY,
  type ImageSourcePolicy,
} from "@/lib/utils/image-source-policy";
import { sanitizeInlineRichHtml } from "@/lib/utils/inline-rich-html";
import { createContext, useContext, useMemo } from "react";

const ImageSourcePolicyContext = createContext<ImageSourcePolicy>(
  EMPTY_IMAGE_SOURCE_POLICY,
);

interface RichTextImagePolicyProps {
  /** Hosts images may load from, computed on the server (`lib/hosting`). */
  allowedHosts: readonly string[];
  /** The Hub's own origin; never an image source. */
  ownOrigin?: string;
  children: React.ReactNode;
}

/**
 * Gives every `RichText` below it the image hosts it may load from. Without a
 * provider no remote image loads: each one shows as a link to its host.
 */
export function RichTextImagePolicy({
  allowedHosts,
  ownOrigin,
  children,
}: RichTextImagePolicyProps) {
  const policy = useMemo(
    () => ({ allowedHosts, ownOrigin }),
    [allowedHosts, ownOrigin],
  );
  return (
    <ImageSourcePolicyContext.Provider value={policy}>
      {children}
    </ImageSourcePolicyContext.Provider>
  );
}

interface RichTextProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "children" | "dangerouslySetInnerHTML"
> {
  /** Author HTML: a question title, a choice label or a piped value. */
  html: string;
}

/**
 * Renders author-written inline HTML (formatting, links and https images) the
 * one way Hub allows: through `sanitizeInlineRichHtml` and the image policy
 * from `RichTextImagePolicy`. Images are
 * lazy-loaded and sized here (aspect kept, at most 40px high and 160px wide);
 * the preset drops every author size, so text keeps its line.
 *
 * For a grid cell, the table of contents or an export, use
 * `htmlSanitizer.toPlainText` instead: those contexts show no markup.
 */
export function RichText({ html, className, ...props }: RichTextProps) {
  const policy = useContext(ImageSourcePolicyContext);
  const sanitized = useMemo(
    () => sanitizeInlineRichHtml(html, policy),
    [html, policy],
  );

  return (
    <span
      className={cn(
        "[&_img]:inline-block [&_img]:h-auto [&_img]:max-h-10 [&_img]:w-auto [&_img]:max-w-40 [&_img]:align-middle",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      {...props}
    />
  );
}
