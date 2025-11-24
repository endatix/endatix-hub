import { NotFoundComponent } from "@/components/error-handling/not-found";
import "@/components/error-handling/not-found/not-found-styles-standalone.css";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Form Not Found",
  description: "The form you are requesting does not exist.",
};

export default function NotFoundEmbedForm() {
  return (
    <div className="not-found-container">
      <NotFoundComponent
        notFoundTitle="Not found"
        notFoundSubtitle="The survey you are looking for does not exist."
        notFoundMessage="Please check the URL and try again."
        titleSize="large"
      ></NotFoundComponent>
    </div>
  );
}
