import { SheepBuddy } from '@/components/error-handling/sheep-buddy';
import { cn } from '@/lib/utils';

export interface ErrorPageProps {
  statusCode: string;
  title: string;
  subtitle?: string;
  message?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Shared chrome for Hub full-page errors (404, unexpected, global).
 */
export function ErrorPage({
  statusCode,
  title,
  subtitle,
  message,
  children,
  className,
}: Readonly<ErrorPageProps>) {
  return (
    <section
      className={cn(
        'mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-6',
        className,
      )}
    >
      <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex justify-center md:justify-start">
          <SheepBuddy />
        </div>
        <div className="relative flex flex-col gap-4 text-center md:text-left">
          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 text-[120px] leading-none font-extrabold text-primary/10 select-none md:left-0 md:translate-x-0 md:text-[140px]">
            {statusCode}
          </span>
          <h1 className="relative z-10 max-w-3xl text-4xl leading-tight font-extrabold text-foreground md:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-2xl leading-tight font-medium text-muted-foreground md:text-4xl">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {(message || children) && (
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}
          {children}
        </div>
      )}
    </section>
  );
}
