import "./not-found-sheep.css";

interface NotFoundPageProps {
  notFoundTitle?: string;
  notFoundSubtitle?: string;
  titleSize?: "small" | "medium" | "large";
  notFoundMessage?: string;
  children?: React.ReactNode;
}

const DEFAULT_NOT_FOUND_TITLE = "404";
const DEFAULT_NOT_FOUND_SUBTITLE = "This page could not be found.";
const DEFAULT_NOT_FOUND_MESSAGE =
  "Sorry, the page you're looking for doesn't exist, may have been removed, or its name may have changed.";

export const NotFoundComponent: React.FC<NotFoundPageProps> = ({
  notFoundTitle = DEFAULT_NOT_FOUND_TITLE,
  notFoundSubtitle = DEFAULT_NOT_FOUND_SUBTITLE,
  titleSize = "large",
  notFoundMessage = DEFAULT_NOT_FOUND_MESSAGE,
  children,
}) => {
  const titleSizeClass =
    titleSize === "small"
      ? "text-4xl"
      : titleSize === "medium"
      ? "text-6xl"
      : "text-9xl";

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-16 text-center">
      <h1 className={`endatix-error-h1 ${titleSizeClass} text-primary mb-4`}>
        {notFoundTitle}
      </h1>
      <div className="inline-block mb-4">
        <h2 className="text-2xl font-bold mb-8">{notFoundSubtitle}</h2>
      </div>
      <Sheep />
      <p className="mt-2 text-muted-foreground">{notFoundMessage}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

const Sheep = () => {
  return (
    <div className="sheep">
      <div className="top">
        <div className="body"></div>
        <div className="head">
          <div className="eye one"></div>
          <div className="eye two"></div>
          <div className="ear one"></div>
          <div className="ear two"></div>
        </div>
      </div>
      <div className="legs">
        <div className="leg"></div>
        <div className="leg"></div>
        <div className="leg"></div>
      </div>
    </div>
  );
};
