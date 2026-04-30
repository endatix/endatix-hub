import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CreateDataListButton() {
  return (
    <Button asChild>
      <Link href="/data-lists?create=1">
        <Plus className="h-4 w-4" />
        Create List
      </Link>
    </Button>
  );
}
