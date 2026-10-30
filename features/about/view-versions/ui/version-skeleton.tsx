import { Skeleton } from "@/components/ui/skeleton";

/** A version still loading, on the panel's tinted section. */
export function VersionSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-24 bg-foreground/10" />
      <span className="sr-only">Loading version</span>
    </>
  );
}
