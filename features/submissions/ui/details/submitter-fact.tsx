import CopyToClipboard from "@/components/copy-to-clipboard";

interface SubmitterFactProps {
  label: string;
  value: string;
  copyValue?: string;
}

/** One labelled value on the Submitter tab, with a copy button when there is something to copy. */
export function SubmitterFact({
  label,
  value,
  copyValue,
}: Readonly<SubmitterFactProps>) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
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
      <span className="text-sm font-semibold break-all text-slate-900 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}
