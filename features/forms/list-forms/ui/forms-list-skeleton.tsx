import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_FORMS_PAGE_SIZE } from "../utils";

interface FormsListSkeletonProps {
  pageSize?: number;
}

export function FormsListSkeleton({
  pageSize = DEFAULT_FORMS_PAGE_SIZE,
}: Readonly<FormsListSkeletonProps>) {
  const cards = Array.from(
    { length: Math.min(pageSize, 8) },
    (_, index) => index,
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {cards.map((card) => (
        <div key={card} className="group flex flex-col justify-between gap-1">
          <Skeleton className="h-[230px] w-full rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
