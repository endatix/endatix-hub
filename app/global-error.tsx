'use client';

import { UnexpectedErrorView } from '@/components/error-handling/error-page';
import '@/components/error-handling/not-found/not-found-sheep.css';
import '@/components/error-handling/not-found/not-found-styles-standalone.css';
import { getPublicAssetPath } from '@/lib/hosting';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong | Endatix Hub</title>
        <link
          rel="icon"
          href={getPublicAssetPath('/assets/icons/icon.svg')}
          type="image/svg+xml"
        />
      </head>
      <body>
        <div className="not-found-container">
          <UnexpectedErrorView error={error} retry={retry} />
        </div>
      </body>
    </html>
  );
}
