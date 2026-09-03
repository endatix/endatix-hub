import Image from "next/image";
import { getPublicAssetPath } from "@/lib/hosting";
import { cn } from "@/lib/utils";

/** Endatix wordmark for `(auth)` pages (light + dark assets). */
export function AuthLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={cn("flex justify-center", className)}>
      <Image
        src={getPublicAssetPath("/assets/icons/endatix-logo-wordmark-blue.svg")}
        alt="Endatix Hub"
        width={3778}
        height={706}
        priority
        className="h-10 w-auto dark:hidden"
      />
      <Image
        src={getPublicAssetPath(
          "/assets/icons/endatix-logo-wordmark-white.svg",
        )}
        alt="Endatix Hub"
        width={3778}
        height={706}
        priority
        className="hidden h-10 w-auto dark:block"
      />
    </div>
  );
}
