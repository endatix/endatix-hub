import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function SubmissionFilesTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File name</TableHead>
          <TableHead>Original file name</TableHead>
          <TableHead>Question</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="w-[180px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-5 w-48" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-16" />
                <Skeleton className="h-9 w-20" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
