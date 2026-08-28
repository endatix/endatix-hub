import { SheepBuddy } from '@/components/error-handling/sheep-buddy';
import '@/components/error-handling/not-found/not-found-sheep.css';
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
        'mx-auto flex min-h-[min(32rem,70vh)] w-full max-w-4xl flex-col justify-center gap-8 px-6 py-10',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
        <div className="shrink-0 [&_.sheep]:mb-0">
          <SheepBuddy />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col items-center gap-3 text-center md:items-start md:text-left">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-[5.5rem] leading-none font-extrabold text-primary/10 select-none md:left-0 md:translate-x-0 md:text-[7rem]"
          >
            {statusCode}
          </span>
          <p className="relative z-10 text-xs font-semibold tracking-[0.22em] text-primary uppercase">
            {statusCode}
          </p>
          <h1 className="relative z-10 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-xl text-lg font-medium text-muted-foreground md:text-xl">
              {subtitle}
            </p>
          ) : null}
          {message ? (
            <p className="max-w-xl text-sm text-on-surface-variant">{message}</p>
          ) : null}
        </div>
      </div>

      {children ? (
        <div className="flex flex-col gap-4">{children}</div>
      ) : null}
    </section>
  );
}
