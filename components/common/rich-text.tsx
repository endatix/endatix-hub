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
 * lazy-loaded and sized here (aspect kept, at most 40px high and 160px wide);
 * the preset drops every author size, so text keeps its line.
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
        "[&_img]:inline-block [&_img]:h-auto [&_img]:max-h-10 [&_img]:w-auto [&_img]:max-w-40 [&_img]:align-middle",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
      {...props}
    />
  );
}
