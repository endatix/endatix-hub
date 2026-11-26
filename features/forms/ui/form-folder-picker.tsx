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

export function FormFolderPicker(props: Readonly<Props>) {
  return (
    <FolderReadBoundary {...props.folderRead}>
      <Select
        value={props.selectedFolderId}
        onValueChange={props.onFolderChange}
        disabled={props.pending}
      >
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Select folder" />
        </SelectTrigger>
        <FolderOptions folders={props.folderSelectItems} />
      </Select>
    </FolderReadBoundary>
  );
}

function FolderOptions({ folders }: Readonly<{ folders: Folder[] }>) {
  return (
    <SelectContent>
      <SelectItem value="__none__">No folder</SelectItem>
      {folders.map((f) => (
        <SelectItem key={f.id} value={f.id}>
          {f.name}
        </SelectItem>
      ))}
    </SelectContent>
  );
}
