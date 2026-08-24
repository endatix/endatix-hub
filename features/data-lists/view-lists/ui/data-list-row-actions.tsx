"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildDataListDetailHref } from "../utils";
import type { DataList } from "@/lib/endatix-api/data-lists/types";
import { Eye, MoreHorizontal, PencilLine, Trash2, Upload } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface DataListRowActionsProps {
  dataList: DataList;
  onDelete: (dataList: DataList) => void;
}

export function DataListRowActions({
  dataList,
  onDelete,
}: Readonly<DataListRowActionsProps>) {
  const detailHref = buildDataListDetailHref(String(dataList.id));
  const editHref = buildDataListDetailHref(String(dataList.id), {
    action: "edit",
  });
  const replaceHref = buildDataListDetailHref(String(dataList.id), {
    action: "replace",
  });
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
          <Link href={detailHref as Route}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={editHref as Route}>
            <PencilLine className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={replaceHref as Route}>
            <Upload className="mr-2 h-4 w-4" />
            Replace Items
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault();
            onDelete(dataList);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
