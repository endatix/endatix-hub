import { CircleCheckBig, CircleX, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/loaders/spinner";
import { cn } from "@/lib/utils";

export type AuthStatusTone =
  | "success"
  | "error"
  | "warning"
  | "pending"
  | "prompt";

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
  description?: React.ReactNode;
  children?: React.ReactNode;
}

/** Terminal or confirmation state for `(auth)` pages. `prompt` has no status glyph. */
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
