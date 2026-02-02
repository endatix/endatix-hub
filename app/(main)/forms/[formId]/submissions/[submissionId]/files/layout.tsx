import { AssetStorageProvider } from "@/features/asset-storage/server";
import { FileModal } from "@/features/asset-storage/use-cases/get-user-file/ui";
import { Spinner } from "@/components/loaders/spinner";
import { Suspense } from "react";

type LayoutProps = {
  children: React.ReactNode;
  modal: React.ReactNode;
  params: Promise<{ formId: string; submissionId: string }>;
};

interface FileModalLoadingFallbackProps {
  formId: string;
  submissionId: string;
}

function FileModalLoadingFallback({
  formId,
  submissionId,
}: Readonly<FileModalLoadingFallbackProps>) {
  return (
    <FileModal formId={formId} submissionId={submissionId}>
      <div className="flex min-h-[200px] items-center justify-center py-12">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    </FileModal>
  );
}

export default async function FilesLayout({
  children,
  modal,
  params,
}: Readonly<LayoutProps>) {
  const { formId, submissionId } = await params;
  return (
    <AssetStorageProvider>
      {children}
      <Suspense
        fallback={
          <FileModalLoadingFallback
            formId={formId}
            submissionId={submissionId}
          />
        }
      >
        {modal}
      </Suspense>
    </AssetStorageProvider>
  );
}
