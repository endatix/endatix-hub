import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";

export function CreateFolderButton() {
  return (
    <Button asChild>
      <Link href="/folders?action=create">
        <FolderPlus className="h-4 w-4" />
        Create Folder
      </Link>
    </Button>
  );
}
