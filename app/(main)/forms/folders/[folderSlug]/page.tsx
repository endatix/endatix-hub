import PageTitle from '@/components/headings/page-title';
import { Button } from '@/components/ui/button';
import { auth } from '@/auth';
import { SIGNIN_PATH, UNAUTHORIZED_PATH } from '@/features/auth';
import { authorization } from '@/features/auth/authorization';
import { AssetStorageProvider } from '@/features/asset-storage/server';
import FormsList from '@/features/forms/ui/forms-list';
import { ApiErrorType, ApiResult, EndatixApi } from '@/lib/endatix-api';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { FilePlus2, FolderOpen } from 'lucide-react';

type PageProps = {
  params: Promise<{ folderSlug: string }>;
};

export default async function FolderSlugFormsPage({ params }: PageProps) {
  const { folderSlug } = await params;
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const folderResult = await api.folders.getBySlug(folderSlug);

  if (ApiResult.isError(folderResult)) {
    if (folderResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    if (folderResult.error.type === ApiErrorType.ForbiddenError) {
      redirect(UNAUTHORIZED_PATH);
    }
    notFound();
  }

  const folder = folderResult.data;
  const formsResult = await api.forms.list({ folderId: folder.id });

  if (ApiResult.isError(formsResult)) {
    if (formsResult.error.type === ApiErrorType.AuthError) {
      redirect(SIGNIN_PATH);
    }
    if (formsResult.error.type === ApiErrorType.ForbiddenError) {
      redirect(UNAUTHORIZED_PATH);
    }
    return (
      <div className="mt-4 p-6 text-destructive">
        {formsResult.error.message}
      </div>
    );
  }

  return (
    <AssetStorageProvider>
      <div className="mt-2 mb-4 flex flex-col gap-4 sm:mt-2 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle title={folder.name} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/forms/folders">Folders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/forms">All forms</Link>
          </Button>
        </div>
      </div>
      {folder.description ? (
        <p className="text-muted-foreground mb-6 text-sm">{folder.description}</p>
      ) : null}
      {formsResult.data.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No forms in this folder</EmptyTitle>
            <EmptyDescription>
              This folder does not contain any forms yet. Create a form and
              assign it here to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className='flex-row justify-center gap-2'>
            <Button asChild>
              <Link href='/forms/create'>
                <FilePlus2 data-icon='inline-start' />
                Create a Form
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <FormsList forms={formsResult.data} />
      )}
    </AssetStorageProvider>
  );
}
