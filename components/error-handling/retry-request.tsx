"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RetryRequest() {
  const router = useRouter();
  return <Button onClick={() => router.refresh()}>Try again</Button>;
}
