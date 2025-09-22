import { NotFoundComponent } from "@/components/error-handling/not-found";
import "@/components/error-handling/not-found/not-found-styles-standalone.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
  generator: "Endatix",
  keywords: [
    "endatix",
    "endatix hub",
    "endatix hub app",
    "forms-management",
    "ai-form-builder",
  ],
  applicationName: "Endatix Hub",
  publisher: "Endatix Ltd.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <div className="not-found-container">
          <NotFoundComponent
            notFoundTitle="404"
            notFoundSubtitle="The page you are looking for does not exist."
            notFoundMessage="Please check the URL and try again."
            titleSize="large"
          ></NotFoundComponent>
        </div>
      </body>
    </html>
  );
}
