import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ROW_COUNT = 5;

export function SubmissionFilesTableSkeleton() {
  const rows = Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => i + 1);
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
        {rows.map((row) => (
          <TableRow key={row}>
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
