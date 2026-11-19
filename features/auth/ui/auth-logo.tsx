import { BrandLogo } from "@/lib/branding/client";
import { cn } from "@/lib/utils";

/** The brand's wordmark for `(auth)` pages (light + dark). */
export function AuthLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn("flex justify-center", className)}>
      <BrandLogo className="h-10 w-auto" priority />
    </div>
  );
}
