import { SheepBuddy } from "@/components/error-handling/sheep-buddy";
import "@/components/error-handling/not-found/not-found-sheep.css";
import { cn } from "@/lib/utils";

/**
 * Longest value still readable as a watermark numeral (`404`, `500`, `503`).
 * Anything longer is a phrase, and a phrase wraps across the copy it sits behind.
 */
const MAX_WATERMARK_LENGTH = 4;

export interface ErrorPageProps {
  /**
   * Short HTTP status painted as the background watermark — `404`, `500`.
   * Omit to drop it. Anything longer than {@link MAX_WATERMARK_LENGTH} is ignored:
   * the watermark is decoration, and only a real code reads as one.
   */
  code?: string;
  /** Short label above the headline, e.g. `Form not found`. Rendered uppercase. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared chrome for every Hub full-page error — 404, 403, unexpected, global.
 *
 * One centred column at every breakpoint: the sheep sits above the copy and scales
 * through `--sheep-scale`, so there is no sheep-beside-copy variant to keep in sync.
 */
export function ErrorPage({
  code,
  eyebrow,
  title,
  subtitle,
  message,
  children,
  className,
}: Readonly<ErrorPageProps>) {
  const watermark =
    code && code.length <= MAX_WATERMARK_LENGTH ? code : undefined;

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col items-center justify-center",
        "gap-8 px-6 py-12 text-center",
        "min-h-[min(32rem,70vh)]",
        className,
      )}
    >
      <SheepBuddy />

      <div className="relative flex min-w-0 flex-col items-center gap-3">
        {watermark ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              "text-[clamp(5rem,15vw,8rem)] leading-none font-extrabold tracking-tight",
              "whitespace-nowrap text-primary/10 select-none",
            )}
          >
            {watermark}
          </span>
        ) : null}

        {eyebrow ? (
          <p className="relative z-10 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}

        <h1 className="relative z-10 text-3xl font-extrabold tracking-tight text-balance text-foreground md:text-4xl">
          {title}
        </h1>

        {subtitle ? (
          <p className="relative z-10 text-lg font-medium text-pretty text-muted-foreground">
            {subtitle}
          </p>
        ) : null}

        {message ? (
          <p className="relative z-10 text-sm text-pretty text-on-surface-variant">
            {message}
          </p>
        ) : null}
      </div>

      {children ? (
        <div className="flex w-full flex-col items-center gap-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
