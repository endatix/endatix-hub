import { ErrorPage } from "@/components/error-handling/error-page";
import "./not-found-sheep.css";

interface NotFoundPageProps {
  /**
   * HTTP code for the watermark. Defaults to `404`, which is what every
   * not-found route is. Pass `undefined` to render without a watermark.
   */
  notFoundCode?: string;
  /** Short label above the headline, e.g. `Form not found`. */
  notFoundTitle?: string;
  notFoundSubtitle?: string;
  notFoundMessage?: string;
  children?: React.ReactNode;
}

const DEFAULT_NOT_FOUND_CODE = "404";
const DEFAULT_NOT_FOUND_TITLE = "Page not found";
const DEFAULT_NOT_FOUND_SUBTITLE = "This page could not be found.";
const DEFAULT_NOT_FOUND_MESSAGE =
  "Sorry, the page you're looking for doesn't exist, may have been removed, or its name may have changed.";

export const NotFoundComponent: React.FC<NotFoundPageProps> = ({
  notFoundCode = DEFAULT_NOT_FOUND_CODE,
  notFoundTitle = DEFAULT_NOT_FOUND_TITLE,
  notFoundSubtitle = DEFAULT_NOT_FOUND_SUBTITLE,
  notFoundMessage = DEFAULT_NOT_FOUND_MESSAGE,
  children,
}) => {
  // Routes that predate the `code`/`eyebrow` split pass "404" as the title.
  // That is the watermark's job, not the label's - don't print it twice.
  const isCodeAsTitle = notFoundTitle === notFoundCode;

  return (
    <ErrorPage
      code={notFoundCode}
      eyebrow={isCodeAsTitle ? DEFAULT_NOT_FOUND_TITLE : notFoundTitle}
      title={notFoundSubtitle}
      message={notFoundMessage}
    >
      {children}
    </ErrorPage>
  );
};
