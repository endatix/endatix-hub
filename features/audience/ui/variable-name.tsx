import CopyToClipboard from "@/components/copy-to-clipboard";

/**
 * A property's variable name: the literal surveys and exports use, so it is monospace and
 * copyable everywhere it is shown (DESIGN.md §5 Copy affordance, `inline` layout).
 */
export function VariableName({ value }: Readonly<{ value: string }>) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <code className="font-mono text-xs break-all text-on-surface-variant">
        {value}
      </code>
      <CopyToClipboard
        layout="inline"
        copyValue={value}
        label={`Copy variable name ${value}`}
      />
    </span>
  );
}
