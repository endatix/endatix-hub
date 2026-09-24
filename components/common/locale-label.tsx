import {
  catalogLocaleCodeLabel,
  catalogLocaleEnglishName,
} from "@/lib/localization";
import { cn } from "@/lib/utils";

interface LocaleLabelProps {
  /** Catalog locale key (`default`, `es`, `pt-BR`). */
  catalogLocale: string;
  className?: string;
}

/**
 * A survey language as "Spanish es": the English name plus the short code.
 * The code inherits the surrounding text colour at reduced opacity, so it
 * stays legible on a badge, a menu item or plain text in both palettes.
 */
export function LocaleLabel({
  catalogLocale,
  className,
}: Readonly<LocaleLabelProps>) {
  return (
    <span
      className={cn("inline-flex min-w-0 items-baseline gap-1.5", className)}
    >
      <span className="truncate">
        {catalogLocaleEnglishName(catalogLocale)}
      </span>
      <span className="font-mono text-[0.85em] font-normal opacity-70">
        {catalogLocaleCodeLabel(catalogLocale)}
      </span>
    </span>
  );
}
