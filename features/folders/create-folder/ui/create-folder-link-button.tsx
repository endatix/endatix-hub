import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import Link from "next/link";

export function CreateFolderLinkButton() {
  return (
    <Button asChild>
      <Link href="/folders?action=create">
        <FolderPlus className="h-4 w-4" />
        Create Folder
      </Link>
    </Button>
  );
}
