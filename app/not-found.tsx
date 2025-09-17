import { Button } from "@/components/ui/button";
import Link from "next/link";
import { NotFoundComponent } from "@/components/error-handling/not-found";

export default function NotFoundPage() {
  return (
    <NotFoundComponent>
      <Link href={"/forms"}>
        <Button className="mt-8">Back to forms</Button>
      </Link>
    </NotFoundComponent>
  );
}
