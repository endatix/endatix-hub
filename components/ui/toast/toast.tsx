import React, { useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { ToastProps, ToastVariant } from "./types";
import { Button } from "../button";
import { ToastProgress } from "./toast-progress";
import { ToastIcon } from "./toast-icon";

const DEFAULT_DURATION = 5000;

const DEFAULT_TOAST_PROPS: Partial<Omit<ToastProps, "id">> = {
  variant: "info",
  duration: DEFAULT_DURATION,
  description: undefined,
  progressBar: "right-to-left",
  includeIcon: true,
  action: undefined,
  SvgIcon: undefined,
};

// Type for variant method arguments
type ToastOptions = Omit<
  ToastProps,
  "id" | "type" | "jsx" | "delete" | "promise" | "variant"
> & {
  id?: string | number;
};
type ToastContentInput = string | React.ReactElement | ToastOptions;

function normalizeArgs(
  arg1: ToastContentInput,
  arg2?: Omit<ToastOptions, "variant">,
): Omit<ToastOptions, "variant"> & { title: ToastOptions["title"] } {
  if (typeof arg1 === "string" || React.isValidElement(arg1)) {
    return { ...arg2, title: arg1 };
  }
  return arg1;
}

function createToast(toast: ToastOptions & { variant?: ToastVariant }) {
  const mergedProps = {
    ...DEFAULT_TOAST_PROPS,
    ...toast,
  };
  if (!mergedProps.title) {
    throw new Error("Toast title is required");
  }
  if (!mergedProps.variant) {
    throw new Error("Toast variant is required");
  }

  if (mergedProps.id) {
    return sonnerToast.custom(
      (id) => (
        <Toast {...(mergedProps as ToastProps)} id={mergedProps.id ?? id} />
      ),
      mergedProps.id ? { id: mergedProps.id } : undefined,
    );
  }

  return sonnerToast.custom((id) => (
    <Toast {...(mergedProps as ToastProps)} id={id} />
  ));
}

const toast = Object.assign(createToast, {
  success: (arg1: ToastContentInput, arg2?: Omit<ToastOptions, "variant">) => {
    const props = normalizeArgs(arg1, arg2);
    return createToast({ ...props, variant: "success" });
  },
  error: (arg1: ToastContentInput, arg2?: Omit<ToastOptions, "variant">) => {
    const props = normalizeArgs(arg1, arg2);
    return createToast({ ...props, variant: "error" });
  },
  warning: (arg1: ToastContentInput, arg2?: Omit<ToastOptions, "variant">) => {
    const props = normalizeArgs(arg1, arg2);
    return createToast({ ...props, variant: "warning" });
  },
  info: (arg1: ToastContentInput, arg2?: Omit<ToastOptions, "variant">) => {
    const props = normalizeArgs(arg1, arg2);
    return createToast({ ...props, variant: "info" });
  },
});

function Toast({
  id,
  title,
  description,
  duration,
  action,
  progressBar,
  variant,
  SvgIcon,
  includeIcon,
}: ToastProps) {
  const [isPaused, setIsPaused] = React.useState(false);
  const lastUpdatedRef = React.useRef(Date.now());
  const remainingTimeRef = React.useRef(duration ?? DEFAULT_DURATION);
  const UPDATE_TIME_INTERVAL = 50;
  const buttonProps = action ? { ...action } : {};
  const hasDetailRow = Boolean(description || action);

  const handleDismiss = useCallback(() => {
    setTimeout(() => {
      sonnerToast.dismiss(id);
    }, UPDATE_TIME_INTERVAL);
  }, [id]);

  const handlePause = useCallback(() => {
    lastUpdatedRef.current = Date.now();
    setIsPaused(true);
  }, []);

  const handleResume = useCallback(() => {
    lastUpdatedRef.current = Date.now();
    setIsPaused(false);
  }, []);

  React.useEffect(() => {
    remainingTimeRef.current = duration ?? DEFAULT_DURATION;
    lastUpdatedRef.current = Date.now();
  }, [duration]);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (duration === 0) {
      return;
    }

    if (!isPaused) {
      timeoutId = setInterval(() => {
        const now = Date.now();
        const timePassed = now - lastUpdatedRef.current;
        lastUpdatedRef.current = now;

        remainingTimeRef.current = Math.max(
          0,
          remainingTimeRef.current - timePassed,
        );
      }, UPDATE_TIME_INTERVAL);
    }

    return () => clearInterval(timeoutId);
  }, [isPaused, duration]);

  return (
    <div
      className="relative flex w-full min-w-[356px] flex-col items-center justify-between gap-0 overflow-hidden rounded-lg bg-card shadow-lg ring-1 ring-black/5 md:max-w-[364px]"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
    >
      <div className="w-full p-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
          {includeIcon ? (
            <div className="self-center">
              <ToastIcon
                variant={variant}
                SvgIcon={SvgIcon}
                includeIcon={includeIcon}
              />
            </div>
          ) : (
            <span />
          )}
          <div>
            <div className="text-sm font-medium">{title}</div>
            {hasDetailRow && description ? (
              <div className="mt-1 text-sm text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {action ? (
            <div className="flex items-center text-sm">
              <Button
                size="sm"
                variant="outline"
                {...buttonProps}
                onClick={() => {
                  action.onClick();
                  handleDismiss();
                }}
              >
                {action.label}
              </Button>
            </div>
          ) : (
            <span />
          )}
        </div>
      </div>
      {progressBar !== "none" && (
        <ToastProgress
          duration={duration ?? DEFAULT_DURATION}
          variant={variant}
          direction={progressBar ?? "left-to-right"}
          onComplete={handleDismiss}
          remainingTimeRef={remainingTimeRef}
          isPaused={isPaused}
        />
      )}
    </div>
  );
}

export { toast };
