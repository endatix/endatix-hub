import { ErrorPage } from '@/components/error-handling/error-page';
import './not-found-sheep.css';

interface NotFoundPageProps {
  notFoundTitle?: string;
  notFoundSubtitle?: string;
  /** @deprecated Layout is shared via ErrorPage; kept for call-site compatibility. */
  titleSize?: 'small' | 'medium' | 'large';
  notFoundMessage?: string;
  children?: React.ReactNode;
}

const DEFAULT_NOT_FOUND_TITLE = '404';
const DEFAULT_NOT_FOUND_SUBTITLE = 'This page could not be found.';
const DEFAULT_NOT_FOUND_MESSAGE =
  "Sorry, the page you're looking for doesn't exist, may have been removed, or its name may have changed.";

export const NotFoundComponent: React.FC<NotFoundPageProps> = ({
  notFoundTitle = DEFAULT_NOT_FOUND_TITLE,
  notFoundSubtitle = DEFAULT_NOT_FOUND_SUBTITLE,
  titleSize: _titleSize,
  notFoundMessage = DEFAULT_NOT_FOUND_MESSAGE,
  children,
}) => {
  return (
    <ErrorPage
      statusCode={notFoundTitle}
      title={notFoundSubtitle}
      message={notFoundMessage}
    >
      {children}
    </ErrorPage>
  );
};
