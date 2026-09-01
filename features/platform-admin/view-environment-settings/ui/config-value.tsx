"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";

interface ConfigValueProps {
  value: string | null;
  /** Accessible name for the copy button, e.g. "Copy PostHog host". */
  copyLabel: string;
  /** Turn off for short enum-like values nobody needs to paste elsewhere. */
  copyable?: boolean;
}

/**
 * Literal configuration value. Every resolved value renders the same way —
 * monospace, wrapping rather than truncating so nothing is hidden, with the
 * same copy affordance — so values never look like they mean different things.
 */
export function ConfigValue({
  value,
  copyLabel,
  copyable = true,
}: Readonly<ConfigValueProps>) {
  if (!value) {
    return (
      <span className="font-mono text-sm text-muted-foreground">
        <span className="sr-only">Not set</span>
        <span aria-hidden="true">—</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="min-w-0 font-mono text-sm break-all">{value}</span>
      {copyable && (
        <CopyToClipboard
          layout="inline"
          copyValue={value}
          label={copyLabel}
          buttonClassName="size-6"
        />
      )}
    </span>
  );
}
