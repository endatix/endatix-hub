'use client';

import { UnexpectedErrorView } from '@/components/error-handling/error-page';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <UnexpectedErrorView error={error} retry={retry} />;
}
