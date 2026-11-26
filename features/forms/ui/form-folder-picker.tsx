import {
  FolderReadBoundary,
  type usePickerFolders,
} from "@/features/folders/list-folders";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Folder } from "@/lib/endatix-api/folders/types";

interface Props {
  selectedFolderId: string;
  folderSelectItems: Folder[];
  pending: boolean;
  onFolderChange: (value: string) => void;
  folderRead: ReturnType<typeof usePickerFolders>;
}

export function FormFolderPicker({
  selectedFolderId,
  folderSelectItems,
  pending,
  onFolderChange,
  folderRead,
}: Readonly<Props>) {
  return (
    <FolderReadBoundary {...folderRead}>
      <Select
        value={selectedFolderId}
        onValueChange={onFolderChange}
        disabled={pending}
      >
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Select folder" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No folder</SelectItem>
          {folderSelectItems.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FolderReadBoundary>
  );
}
