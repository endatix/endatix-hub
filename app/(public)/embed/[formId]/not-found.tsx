import "@/app/globals.css";
import {
  NotFoundComponent,
  PublicNotFoundFrame,
} from "@/components/error-handling/not-found";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Form Not Found",
  description: "The form you are requesting does not exist.",
};

export default function NotFoundEmbedForm() {
  return (
    <PublicNotFoundFrame>
      <NotFoundComponent
        notFoundTitle="Survey not found"
        notFoundSubtitle="We couldn't find that survey."
        notFoundMessage="Check the link and try again."
      />
    </PublicNotFoundFrame>
  );
}
