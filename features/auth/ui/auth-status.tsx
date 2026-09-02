import { CircleCheckBig, CircleX, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/loaders/spinner";
import { cn } from "@/lib/utils";

/**
 * What an auth page is saying. The three outcome tones mirror the status
 * vocabulary in DESIGN.md; `pending` is work still in flight.
 *
 * `prompt` asks the reader something and reports nothing, so it carries no
 * indicator — a status glyph above "Sign out of Endatix Hub?" claims an
 * outcome that has not happened yet.
 */
export type AuthStatusTone =
  | "success"
  | "error"
  | "warning"
  | "pending"
  | "prompt";

/**
 * A tonal disc rather than a bare glyph: at 24px an outline icon between the
 * wordmark and a bold heading reads as an artifact caught between two stronger
 * shapes. The disc echoes the feature tiles in the hero panel.
 */
const TONE_INDICATORS: Record<
  Exclude<AuthStatusTone, "prompt">,
  { icon: React.ReactNode; surface: string }
> = {
  success: {
    icon: <CircleCheckBig className="size-6" />,
    surface: "bg-success/10 text-success",
  },
  error: {
    icon: <CircleX className="size-6" />,
    surface: "bg-destructive/10 text-destructive",
  },
  warning: {
    icon: <TriangleAlert className="size-6" />,
    surface: "bg-warning/10 text-warning",
  },
  pending: {
    icon: <Spinner className="size-6" />,
    surface: "bg-primary/10 text-primary",
  },
};

interface AuthStatusProps {
  tone: AuthStatusTone;
  title: string;
  /** One sentence under the title. Longer guidance belongs in `children`. */
  description?: React.ReactNode;
  /** Actions and secondary copy, stacked full-width below the description. */
  children?: React.ReactNode;
}

/**
 * Terminal state of an auth flow — verified, link expired, email sent — or a
 * confirmation the reader has to answer.
 *
 * Everything is centred on one axis. The previous pages centred the heading but
 * left the body paragraphs at their default alignment, which is what made them
 * read as broken rather than merely plain.
 */
export function AuthStatus({
  tone,
  title,
  description,
  children,
}: Readonly<AuthStatusProps>) {
  const indicator = tone === "prompt" ? null : TONE_INDICATORS[tone];

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {indicator ? (
        <span
          aria-hidden="true"
          className={cn(
            "flex size-14 items-center justify-center rounded-full",
            indicator.surface,
          )}
        >
          {indicator.icon}
        </span>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {children ? <div className="grid w-full gap-4">{children}</div> : null}
    </div>
  );
}
