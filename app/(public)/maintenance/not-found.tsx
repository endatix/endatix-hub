import "@/app/globals.css";
import {
  NotFoundComponent,
  PublicNotFoundFrame,
} from "@/components/error-handling/not-found";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
  generator: "Endatix",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFoundMaintenancePage() {
  return (
    <PublicNotFoundFrame>
      <NotFoundComponent
        notFoundTitle="Page not found"
        notFoundSubtitle="We couldn't find that page."
        notFoundMessage="Check the URL and try again."
      />
    </PublicNotFoundFrame>
  );
}
