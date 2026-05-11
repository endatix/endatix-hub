'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { FolderDeleteButton } from '@/features/folders/delete-folder';
import { FolderEditDialog, updateFolderAction } from '@/features/folders/update-folder';
import type { Folder } from '@/lib/endatix-api/folders/types';
import { Result } from '@/lib/result';
import { Lock, LockOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

type FolderDetailHeaderActionsProps = {
  folder: Folder;
};

export function FolderDetailHeaderActions({
  folder,
}: Readonly<FolderDetailHeaderActionsProps>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isLocked = folder.immutable;

  const onToggleLock = () => {
    startTransition(async () => {
      const result = await updateFolderAction(folder.id, {
        immutable: !isLocked,
      });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success(isLocked ? 'Folder unlocked' : 'Folder locked');
      router.refresh();
    });
  };

  return (
    <div className='flex items-center gap-2'>
      <Button
        type='button'
        variant='outline'
        onClick={onToggleLock}
        disabled={pending}
      >
        {isLocked ? <LockOpen className='size-4' /> : <Lock className='size-4' />}
        {isLocked ? 'Unlock' : 'Lock'}
      </Button>
      <FolderEditDialog folder={folder} redirectToFolderSlugBase={null} />
      <FolderDeleteButton
        folderId={folder.id}
        folderName={folder.name}
        immutable={folder.immutable}
        afterDeleteHref={'/folders'}
        variant='outline'
      />
    </div>
  );
}
