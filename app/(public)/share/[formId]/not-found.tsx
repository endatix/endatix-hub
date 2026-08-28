import "@/app/globals.css";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Form Not Found",
  description: "The form you are requesting does not exist.",
};

export default function NotFoundSharedForm() {
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
