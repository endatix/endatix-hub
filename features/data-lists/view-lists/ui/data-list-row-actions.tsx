"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataList } from "@/lib/endatix-api/data-lists/types";
import { Eye, MoreHorizontal, PencilLine, Trash2 } from "lucide-react";
import Link from "next/link";

interface DataListRowActionsProps {
  dataList: DataList;
  onDelete: (dataList: DataList) => void;
}

export function DataListRowActions({
  dataList,
  onDelete,
}: DataListRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open data list actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/data-lists/${dataList.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/data-lists/${dataList.id}?action=replace`}>
            <PencilLine className="mr-2 h-4 w-4" />
            Replace Items
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(dataList)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
