import "@/app/globals.css";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-content-canvas px-4">
      <NotFoundComponent
        notFoundTitle="Not found"
        notFoundSubtitle="The survey you are looking for does not exist."
        notFoundMessage="Please check the URL and try again."
      />
    </div>
  );
}
