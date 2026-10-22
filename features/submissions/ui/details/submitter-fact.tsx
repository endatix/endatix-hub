import CopyToClipboard from "@/components/copy-to-clipboard";
import { DASH_NO_DATA, formatOptionalValue } from "./format-details";

interface SubmitterFactProps {
  label: string;
  value?: string | number | null;
  /** Shows a copy button, unless the value is missing. */
  copyable?: boolean;
}

/** One labelled value on the Submitter tab; a dash when the value is missing. */
export function SubmitterFact({
  label,
  value,
  copyable = false,
}: Readonly<SubmitterFactProps>) {
  const text = formatOptionalValue(value);
  const copyValue = copyable && text !== DASH_NO_DATA ? text : undefined;
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <FactLabel copyValue={copyValue} label={label} />
      <span className="text-sm font-semibold break-all text-slate-900 dark:text-slate-100">
        {text}
      </span>
    </div>
  );
}

function FactLabel({
  label,
  copyValue,
}: Readonly<{ label: string; copyValue?: string }>) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
        {label}
      </span>
      {copyValue && (
        <CopyToClipboard
          copyValue={copyValue}
          layout="inline"
          buttonClassName="size-6 hover:bg-slate-100 dark:hover:bg-slate-800"
        />
      )}
    </div>
  );
}
