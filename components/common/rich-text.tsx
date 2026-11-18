import { cn } from "@/lib/utils";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";
import { useMemo } from "react";

interface RichTextProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "children" | "dangerouslySetInnerHTML"
> {
  /** Author HTML: a question title, a choice label or a piped value. */
  html: string;
}

/**
 * Renders author-written inline HTML (formatting, links and https images) the
 * one way Hub allows: through the `inlineRich` sanitizer preset. Images are
 * lazy-loaded and capped in height so an author's size cannot break the layout.
 *
 * For a grid cell, the table of contents or an export, use
 * `htmlSanitizer.toPlainText` instead: those contexts show no markup.
 */
export function RichText({ html, className, ...props }: RichTextProps) {
  const sanitized = useMemo(
    () => htmlSanitizer.sanitize(html, htmlSanitizer.presets.inlineRich),
    [html],
  );

  return (
    <span
      className={cn(
        "[&_img]:inline-block [&_img]:max-h-24 [&_img]:max-w-full [&_img]:align-middle",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      {...props}
    />
  );
}
