import Image from "next/image";
import { getPublicAssetPath } from "@/lib/hosting";
import { cn } from "@/lib/utils";

/**
 * The Endatix wordmark that opens every page under `(auth)`.
 *
 * Light and dark artwork are two files, so each call site previously carried a
 * 20-line pair of `<Image>` tags — six copies that drifted apart. Keep it here.
 */
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
