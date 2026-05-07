export type Folder = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  metadata?: string | null;
  isActive: boolean;
  immutable: boolean;
};

export type CreateFolderRequest = {
  name: string;
  slug?: string | null;
  description?: string | null;
  metadata?: string | null;
  immutable?: boolean;
};

export type UpdateFolderRequest = {
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  metadata?: string | null;
  isActive?: boolean | null;
  immutable?: boolean | null;
};
