import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

export function NeedAssistanceWidget(props: React.ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "mt-auto rounded-lg border border-blue-100 bg-blue-50 p-4",
        props.className,
      )}
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="size-5 shrink-0 text-blue-600" />
        <div>
          <p className="text-xs font-bold text-blue-900">Need Assistance?</p>
          <p className="mt-1 text-[10px] leading-normal text-blue-700">
            Our AI reviewer can help identify logic errors in your variables.
          </p>
          <button className="mt-2 text-[10px] font-bold tracking-tighter text-blue-600 uppercase hover:underline">
            Launch Assistant
          </button>
        </div>
      </div>
    </div>
  );
}
