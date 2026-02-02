import { AssetStorageProvider } from '@/features/asset-storage/server';
import { FileModal } from '@/features/submissions/ui/files/file-modal';
import { Spinner } from '@/components/loaders/spinner';
import { Suspense } from 'react';

type LayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
};

function FileModalLoadingFallback() {
  return (
    <FileModal>
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    </FileModal>
  );
}

export default function FilesLayout({ children, modal }: LayoutProps) {
  return (
    <AssetStorageProvider>
      {children}
      <Suspense fallback={<FileModalLoadingFallback />}>{modal}</Suspense>
    </AssetStorageProvider>
  );
}
