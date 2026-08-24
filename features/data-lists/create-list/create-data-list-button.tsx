"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  currentDataListsListQuery,
  DATA_LISTS_LIST_PATH,
} from "../view-lists/utils";
import { Route } from "next";

export function CreateDataListButton() {
  const searchParams = useSearchParams();
  const listQuery = currentDataListsListQuery(searchParams);
  const params = new URLSearchParams(listQuery);
  params.set("action", "create");
  const href = `${DATA_LISTS_LIST_PATH}?${params.toString()}`;

  return (
    <Button asChild>
      <Link href={href as Route}>
        <Plus className="h-4 w-4" />
        Create List
      </Link>
    </Button>
  );
}
